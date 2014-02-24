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
  var configFile = require('../config');

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
  app.value('configFile', configFile);
  app.config(function ($routeProvider) {
    $routeProvider
      .otherwise({
        redirectTo: '/discover'
      });

    configFile.apps.forEach(function (app) {
      var deps = {};
      deps['app/' + app.id] = function () {
        return loadApp(app);
      };

      $routeProvider.when('/' + app.id, {
        templateUrl: '/kibana/apps/' + app.id + '/index.html',
        resolve: deps
      });
    });
  });

  var loadApp; // so dumb

  app.run(function ($q) {
    loadApp = function (app) {
      var defer = $q.defer();

      require([
        'apps/' + app.id + '/index'
      ], function () {
        defer.resolve();
        delete require.onError;
      });

      require.onError = function () {
        defer.reject();
      };

      // optional dependencies
      require([
        'css!apps/' + app.id + '/index.css'
      ]);

      return defer.promise;
    };
  });

  setup(app, function (err) {
    if (err) throw err;

    // load the elasticsearch service
    require([
      'controllers/kibana',
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