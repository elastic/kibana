define(function (require) {
  var angular = require('angular');
  var RouteManager = require('scripts/homepage/routeManager');
  var HomepageController = require('scripts/homepage/homepage_controller');
  var chartDirective = require('scripts/homepage/chart_directive');

  require('angular-animate');
  require('angular-ui-router');

  return function () {
    var name = 'homepageModule';

    angular.module(name, [
      'ui.router',
      'ngAnimate'
    ])
    .controller('HomepageController', HomepageController)
    .directive('chart', chartDirective)
    .config(RouteManager);

    return name;
  };
});
