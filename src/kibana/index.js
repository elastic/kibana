/**
 * main app level module
 */
define(function (require) {

  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var scopedRequire = require('require');
  var setup = require('./setup');
  var configFile = require('../config');

  require('elasticsearch');
  require('angular-route');

  var kibana = angular.module('kibana', [
    // list external requirements here (modules created
    // by the modules util are added automatically)
    'elasticsearch',
    'ngRoute'
  ]);

  // proceed once setup is complete
  setup(function (err) {
    kibana
      // setup default routes
      .config(function ($routeProvider) {
        $routeProvider
          .otherwise({
            redirectTo: '/' + configFile.defaultAppId
          });

        configFile.apps.forEach(function (app) {
          $routeProvider.when('/' + app.id, {
            templateUrl: 'kibana/apps/' + app.id + '/index.html'
          });
        });
      });

    require([
      'controllers/kibana'
    ].concat(configFile.apps.map(function (app) {
      return 'apps/' + app.id + '/index';
    })), function bootstrap() {
      $(function () {
        angular.bootstrap(document, ['kibana']);
      });
    });

  });

  return kibana;
});