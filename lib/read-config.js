'use strict';
const async = require('async');
const fs = require('fs');
const path = require('path');
const varson = require('varson');
module.exports = function(options, done) {
  //if configFile set, use that
  //else check deploy.{env}.json
  //else check deploy.json
  const pathsToCheck = [];
  if (options.configFile) {
    pathsToCheck.push(path.join(options.repoPath, options.repo, options.configFile));
    pathsToCheck.push(path.join(options.sharedConfigPath || '', options.configFile));
  }
  pathsToCheck.push(path.join(options.repoPath, options.repo, `deploy.${options.env}.json`));
  pathsToCheck.push(path.join(options.sharedConfigPath || '', `deploy.${options.env}.json`));
  pathsToCheck.push(path.join(options.repoPath, options.repo, 'deploy.json'));
  pathsToCheck.push(path.join(options.sharedConfigPath || '', 'deploy.json'));

  async.detectSeries(pathsToCheck, (pathToCheck, next) => {
    fs.stat(pathToCheck, (err) => {
      next(null, !err);
    });
  }, (err, configPath) => {
    if (err) {
      return done(err);
    }

    if (!configPath) {
      return done(null, '', {
        dockerargs: ''
      });
    }

    fs.readFile(configPath, 'utf8', (readErr, configStr) => {
      if (readErr) {
        return done(readErr);
      }
      let config = null;
      try {
        config = JSON.parse(configStr);

        //process dockerargs and virtualHost
        config = varson(config, options);
        if (!config.dockerargs) {
          config.dockerargs = {};
        } else if (typeof config.dockerargs === 'string') {
          options.log(['config', 'warning'], 'dockerargs as a string is going to be deprecated, switch to an object');
          config.dockerargsString = config.dockerargs;
          config.dockerargs = {};
        }
      } catch (e) {
        return done(e);
      }
      return done(null, path.basename(configPath), config);
    });
  });
};
