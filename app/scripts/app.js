define(function (require) {
  require('angular-ui-router');
  require('angular-animate');
  require('angular-cookies');
  require('angular-sanitize');
  require('angular-resource');
  require('angular-local-storage');
  require('text');


  var angular = require('angular');
  var RouteManager = require('scripts/routeManager');
  var CommonModule = require('scripts/common/commonModule');
  var HomepageModule = require('scripts/homepage/homepageModule');

  return angular.module('YoApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'LocalStorageModule',
    'ui.router',
    CommonModule(),
    HomepageModule()
  ])
  .config(RouteManager)
  .config(function (localStorageServiceProvider) {
  localStorageServiceProvider
    .setPrefix('Timesheet')
    .setStorageType('localStorage')
    .setNotify(true, true);
  });
});