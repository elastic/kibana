'use strict';
var path = require('path');
var fs = require('fs');
var bower = require('bower');
var file = require('file-utils');
var requirejs = require('requirejs/bin/r.js');
var _ = require('lodash');
var assign = require('object-assign');
var chalk = require('chalk');
var success = chalk.green;
var danger = chalk.black.bgRed;
var buildConfig = require('./build-config');

/**
 * Convert bower dependencies into paths for
 * RequireJS config file
 */
module.exports = function (opts, done) {
  opts = opts || {};

  var bowerOpts = _.extend({offline: true}, opts.bowerOpts);

  var configDir;
  var config;
  var baseUrl = opts.baseUrl;
  var configPath = opts.config;

  if (configPath) {
    configDir = path.dirname(configPath);
    baseUrl = baseUrl || configDir;

    // Grab the config file, or create one if it doesn't exist
    if (file.exists(configPath)) {
      config = fs.readFileSync(String(configPath), 'utf8');
    } else {
      config = fs.readFileSync(path.join(__dirname, '../templates/config.js'), 'utf8');
    }
  } else {
    baseUrl = baseUrl || './';
  }

  if (!done) {
    done = function () {};
  }

  function run() {
    bower.commands.list({}, bowerOpts)
      .on('end', function (dependencyGraph) {
        if (dependencyGraph) {
          var generatedConfig;

          try {
            generatedConfig = buildConfig(dependencyGraph, _.extend(opts, {
              baseUrl: baseUrl
            }));
          } catch (err) {
            return done(false);
          }

          if (configPath) {
            writeConfig(generatedConfig);
          } else {
            done(generatedConfig);
          }
        }
      })
      .on('error', function (err) {
        console.error(danger('ERR'), process.argv.slice(2).join(' '), '\n');
        console.error(opts.debug ? err.stack : err.message);
        process.exit(err.code || 1);
      });
  }

  /**
   * Write all dependencies to rjs config file
   */
  // @TODO: should maybe make this 'mergeConfig'?
  function writeConfig(generatedConfig) {
    var rjsConfig;
    requirejs.tools.useLib(function (require) {
      rjsConfig = require('transform').modifyConfig(config, function (config) {

        // If the original config defines paths, add the
        // bower component paths to it; otherwise, add a
        // paths map with the bower components.
        // @TODO: CHECK FOR CONFLICTS WITH EXISTING PATHS
        if (generatedConfig.paths) {
          if (config.paths) {
            assign(config.paths, generatedConfig.paths);
          } else {
            config.paths = generatedConfig.paths;
          }
        }

        // Add packages to merged config.
        if (generatedConfig.packages) {
          if (!config.packages) {
            config.packages = [];
          }

          // strip packages that are already added
          var generatedPackages = _.filter(generatedConfig.packages, function(pkg) {
            return typeof _.find(config.packages, function(installedPkg) {
                return installedPkg.name === pkg.name;
              }) === 'undefined';
          });

          config.packages = config.packages.concat(generatedPackages);
        }


        return config;
      });

      fs.writeFileSync(configPath, rjsConfig, 'utf-8');
      console.log(success('Updated RequireJS config with installed Bower components'));

      done(generatedConfig);
    });
  }

  run();
};
