define(function (require) {
  var _ = require('lodash');

  // TODO: this will probably fail to work when we have multiple apps. Might need to propogate
  // registrations to multiple providers
  function enable(app) {
    // keep a reference to each module defined before boot, so that
    // after boot it can define new features. Also serves as a flag.
    var preBootModules = [];

    // the functions needed to register different
    // features defined after boot
    var registerFns = {};

    app.config(function ($controllerProvider, $compileProvider, $filterProvider, $provide) {
      // this is how the internet told me to dynamically add modules :/
      registerFns = {
        controller: $controllerProvider.register,
        directive: $compileProvider.directive,
        factory: $provide.factory,
        service: $provide.service,
        constant: $provide.constant,
        value: $provide.value,
        filter: $filterProvider.register
      };
    });

    /**
     * Modules that need to register components within the application after
     * bootstrapping is complete need to pass themselves to this method.
     *
     * @param  {object} module - The Angular module
     * @return {object} module
     */
    app.useModule = function (module) {
      if (preBootModules) {
        preBootModules.push(module);
      } else {
        _.extend(module, registerFns);
      }
      return module;
    };

    /**
     * Called after app is bootrapped to enable asyncModules
     * @return {[type]} [description]
     */
    app.run(function () {
      _.each(preBootModules, function (module) {
        _.extend(module, registerFns);
      });
      preBootModules = false;
    });
  }

  return enable;
});