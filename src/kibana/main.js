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

  var kibana = angular.module('kibana', []);
  enableAsyncModules(kibana);

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

  dependencies.forEach(function (name) {
    if (name.indexOf('kibana/') === 0) {
      kibana.useModule(angular.module(name, []));
    }
  });

  kibana.requires = dependencies;
  kibana.value('configFile', configFile);

  kibana.config(function ($routeProvider) {
    $routeProvider
      .otherwise({
        redirectTo: '/discover'
      });

    configFile.apps.forEach(function (app) {
      var deps = {};
      deps['app/' + app.id] = function () {
        return kibana.loadChildApp(app);
      };

      $routeProvider.when('/' + app.id, {
        templateUrl: '/kibana/apps/' + app.id + '/index.html',
        resolve: deps
      });
    });
  });

  kibana.run(function ($q) {
    kibana.loadChildApp = function (app) {
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

      return defer.promise;
    };
  });

  setup(kibana, function (err) {
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

  return kibana;
});