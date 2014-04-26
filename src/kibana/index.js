/**
 * main app level module
 */
define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var configFile = require('../config');
  var modules = require('modules');
  var routes = require('routes');

  require('elasticsearch');
  require('angular-route');
  require('angular-bindonce');

  var kibana = angular.module('kibana', [
    // list external requirements here
    'elasticsearch',
    'pasvaz.bindonce',
    'ngRoute'
  ]);

  kibana
    // This stores the Kibana revision number, @REV@ is replaced by grunt.
    .constant('kbnVersion', '@REV@')
    // Use this for cache busting partials
    .constant('cacheBust', 'cache-bust=' + Date.now())
    // attach the route manager's known routes
    .config(routes.config);

  // setup routes
  routes
    .otherwise({
      redirectTo: '/' + configFile.defaultAppId
    });

  // tell the modules util to add it's modules as requirements for kibana
  modules.link(kibana);

  require([
    'controllers/kibana'
  ].concat(configFile.apps.map(function (app) {
    return 'apps/' + app.id + '/index';
  })), function bootstrap() {
    $(function () {
      angular
        .bootstrap(document, ['kibana'])
        .invoke(function ($rootScope, $route) {
          $(document.body).children().show();
        });
    });
  });

  return kibana;
});
