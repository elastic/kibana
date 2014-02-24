define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  require('services/config');
  require('services/courier');

  angular
    .module('kibana/controllers')
    .controller('kibana', function ($scope, courier, configFile) {
      setTimeout(function () {
        courier.start();
      }, 15);

      $scope.apps = configFile.apps;
      $scope.activeApp = '';

      $scope.$on('$routeChangeSuccess', function () {
        if (courier.running()) courier.fetch();
      });
    });
});