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

  var kibana = angular.module('kibana', []);

  var requiredAgularModules = [
    'elasticsearch',
    'ngRoute',
    'kibana',
    'kibana/controllers',
    'kibana/directives',
    'kibana/factories',
    'kibana/services',
    'kibana/filters',
    'kibana/constants'
  ].concat(configFile.apps.map(function (app) {
    return 'app/' + app.id;
  }));

  requiredAgularModules.forEach(function (name) {
    if (name.indexOf('kibana/') === 0) angular.module(name, []);
  });

  kibana.requires = requiredAgularModules;
  kibana.value('configFile', configFile);

  kibana.config(function ($routeProvider) {
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

  setup(kibana, function (err) {
    if (err) throw err;

    // once all of the required modules are loaded, bootstrap angular
    function bootstrap() {
      $(function () {
        angular.bootstrap(document, requiredAgularModules);
      });
    }

    // do some requirejs loading in parallel, otherwise we
    // would have to track everything in the r.js optimization
    // config
    var out = 0;
    function loaded() {
      out ++;
      return function () {
        out--;
        if (!out) {
          // all of the callbacks have been called
          bootstrap();
        }
      };
    }

    // require global modules
    require([
      'controllers/kibana',
      'directives/view',
      'constants/base'
    ], loaded());

    // require each applications root module
    // since these are created via .map the same operation
    // must be done in the r.js optimizer config
    require(configFile.apps.map(function (app) {
      return 'apps/' + app.id + '/index';
    }), loaded());
  });

  return kibana;
});