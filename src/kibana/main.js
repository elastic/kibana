/**
 * main app level module
 */
define(function (require) {

  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var scopedRequire = require('require');
  var enableAsyncModules = require('utils/async_modules');
  var setup = require('./setup');

  require('elasticsearch');
  require('angular-route');

  var app = angular.module('kibana', []);
  enableAsyncModules(app);

  var dependencies = [
    'elasticsearch',
    'ngRoute',
    'kibana',
    'kibana/controllers',
    'kibana/directives',
    'kibana/factories',
    'kibana/services',
    'kibana/filters',
    'kibana/constants'
  ];

  function isScope(obj) {
    return obj && obj.$evalAsync && obj.$watch;
  }

  dependencies.forEach(function (name) {
    if (name.indexOf('kibana/') === 0) {
      app.useModule(angular.module(name, []));
    }
  });

  app.requires = dependencies;

  app.config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'kibana/partials/index.html'
      })
      .when('/config-test', {
        templateUrl: 'courier/tests/config.html',
      })
      .when('/courier-test', {
        templateUrl: 'courier/tests/index.html',
      })
      .otherwise({
        redirectTo: ''
      });
  });

  setup(app, function (err) {
    if (err) throw err;

    // load the elasticsearch service
    require([
      'controllers/kibana',
      'courier/test_directives',
      'constants/base'
    ], function () {
      // bootstrap the app
      $(function () {
        angular
          .bootstrap(document, dependencies);
      });
    });
  });

  return app;
});