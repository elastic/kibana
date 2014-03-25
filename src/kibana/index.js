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
  var notify = require('notify/notify');

  require('elasticsearch');
  require('angular-route');
  require('angular-bindonce');

  var kibana = angular.module('kibana', [
    // list external requirements here
    'elasticsearch',
    'pasvaz.bindonce',
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
          if (app.id === 'discover') return;
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
        notify.lifecycle('bootstrap');
        angular
          .bootstrap(document, ['kibana'])
          .invoke(function () {
            notify.lifecycle('bootstrap', true);
            $(document.body).children().show();
          });

      });
    });

  });

  return kibana;
});
