define(function (require) {
  var angular = require('angular');
  var app = require('kibana');
  var existingModules = {};
  var _ = require('lodash');

  return {
    get: function (moduleName, requires) {
      var module = existingModules[moduleName];

      if (module === void 0) {
        // create the module
        module = existingModules[moduleName] = angular.module(moduleName, []);
        // ensure that it is required by kibana
        app.requires.push(moduleName);
      }

      if (requires) {
        // update requires list with possibly new requirements
        module.requires = _.union(module.requires, requires);
      }

      return module;
    }
  };
});