'use strict';
var _ = require('lodash');
var assign = require('object-assign');
var parse = require('./parse');


/**
 * Build requirejs config object from bower dependencies object.
 */
module.exports = function (dependencyGraph, opts) {
  opts = opts || {};
  var exclude = opts.exclude || [];
  var baseUrl = opts.baseUrl || '';
  var overrides = dependencyGraph.pkgMeta.overrides;

  // Override the main property of each direct dependency.
  if (overrides) {
    _.forOwn(overrides, function (dep, name) {
      if (dep.main) {
        var main = dep.main.trim();
        var dependency = dependencyGraph.dependencies[name];
        if (dependency && main) {
          dependency.pkgMeta.main = main;
        }
      }
    });
  }

  // #84 exclude devDependencies
  if (opts['exclude-dev']) {
    exclude = _.chain(dependencyGraph.pkgMeta.devDependencies || {})
      .reduce(function(exclude,val,key){
        exclude.push(key);
        return exclude;
      },exclude).uniq().value();
  }

  var dependencies = {};
  // Recursively register dependencies if transitive option is specified.
  if (opts.transitive) {
    var registerTransitiveDependencies = function (node) {
      if (node.dependencies) {
        _.forOwn(node.dependencies, function (dep, name) {
          if (!_.has(dependencies, name)) {
            dependencies[name] = dep;
            registerTransitiveDependencies(dep);
          }
        });
      }
    };
    registerTransitiveDependencies(dependencyGraph);
  } else {
    // Otherwise just use top-level dependencies.
    dependencies = dependencyGraph.dependencies;
  }

  var config = {
    paths: {},
    packages: []
  };

  _.forOwn(dependencies, function (dep, name) {
    if (exclude.indexOf(name) !== -1) {
      return;
    }

    var configElement = parse(dep, name, baseUrl);
    if (configElement) {
      if (configElement.paths) {
        assign(config.paths, configElement.paths);
      }
      if (configElement.package) {
        config.packages.push(configElement.package);
      }
    }
  });

  return config;
};
