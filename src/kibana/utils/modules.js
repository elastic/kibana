define(function (require) {
  var angular = require('angular');
  var existingModules = {};
  var _ = require('lodash');
  var links = [];

  return {
    link: function (module) {
      // as modules are defined they will be set as requirements for this app
      links.push(module);

      // merge in the existing modules
      module.requires = _.union(module.requires, _.keys(existingModules));

      // function to call that will unlink the module
      return function unlink() {
        var i = links.indexOf(module);
        if (i > -1) links.splice(i, 1);
      };
    },
    get: function (moduleName, requires) {
      var module = existingModules[moduleName];

      if (module === void 0) {
        // create the module
        module = existingModules[moduleName] = angular.module(moduleName, []);
        // ensure that it is required by linked modules
        _.each(links, function (app) {
          if (!~app.requires.indexOf(moduleName)) app.requires.push(moduleName);
        });
      }

      if (requires) {
        // update requires list with possibly new requirements
        module.requires = _.union(module.requires, requires);
      }

      return module;
    }
  };
});