/**
 * main app level module
 */
define(function (require) {

  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var scopedRequire = require('require');

  require('elasticsearch');
  require('angular-route');

  // keep a reference to each module defined before boot, so that
  // after boot it can define new features. Also serves as a flag.
  var preBootModules = [];

  // the functions needed to register different
  // features defined after boot
  var registerFns = {};

  var dependencies = [
    'elasticsearch',
    'kibana',
    'ngRoute'
  ];

  _('controllers directives factories services filters'.split(' '))
    .map(function (type) { return 'kibana/' + type; })
    .each(function (name) {
      preBootModules.push(angular.module(name, []));
      dependencies.push(name);
    });

  var app = angular.module('kibana', dependencies);

  // This stores the Kibana revision number, @REV@ is replaced by grunt.
  app.constant('kbnVersion', '@REV@');

  // Use this for cache busting partials
  app.constant('cacheBust', 'cache-bust=' + Date.now());

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

  app.config(function ($routeProvider, $controllerProvider, $compileProvider, $filterProvider, $provide) {
    $routeProvider
      .when('/courier-test', {
        templateUrl: 'courier/test.html',
      })
      .otherwise({
        redirectTo: 'courier-test'
      });

    // this is how the internet told me to dynamically add modules :/
    registerFns.controller = $controllerProvider.register;
    registerFns.directive  = $compileProvider.directive;
    registerFns.factory    = $provide.factory;
    registerFns.service    = $provide.service;
    registerFns.filter     = $filterProvider.register;
  });

  // load the core components
  require([
    'services/courier',
    'services/es',
    'services/config',
    'controllers/kibana'
  ], function () {

    // bootstrap the app
    $(function () {
      angular
        .bootstrap(document, dependencies)
        .invoke(function ($rootScope) {
          _.each(preBootModules, function (module) {
            _.extend(module, registerFns);
          });
          preBootModules = false;
        });
    });
  });

  return app;
});