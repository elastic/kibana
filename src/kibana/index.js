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
    // external requirements
    'elasticsearch',
    'ngRoute'
    // internale requirements are added by the modules.js util
  ]);

  // proceed once setup is complete
  setup(function (err) {
    kibana
      // config.js in the root
      .value('configFile', configFile)
      // This stores the Kibana revision number, @REV@ is replaced by grunt.
      .constant('kbnVersion', '@REV@')
      // Use this for cache busting partials
      .constant('cacheBust', 'cache-bust=' + Date.now())
      // setup default routes
      .config(function ($routeProvider) {
        $routeProvider
          .otherwise({
            redirectTo: '/' + configFile.defaultAppId
          });

        configFile.apps.forEach(function (app) {
          $routeProvider.when('/' + app.id, {
            templateUrl: '/kibana/apps/' + app.id + '/index.html'
          });
        });
      });

    require([
      'controllers/kibana'
    ].concat(configFile.apps.map(function (app) {
      return 'apps/' + app.id + '/index';
    })), function bootstrap() {
      $(function () {
        angular.bootstrap(document, 'kibana');
      });
    });

  });

  return kibana;
});