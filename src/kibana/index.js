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
  var modules = require('modules');

  require('elasticsearch');
  require('angular-route');

  var kibana = angular.module('kibana', [
    // list external requirements here
    'elasticsearch',
    'ngRoute'
  ]);

  // tell the modules util to add it's modules as requirements for kibana
  modules.link(kibana);

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
        $(document.body).children().show();
      });
    });

  });

  return kibana;
});