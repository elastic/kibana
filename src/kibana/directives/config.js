define(function (require) {
  var html = require('text!partials/table.html');
  var angular = require('angular');
  var _ = require('lodash');

  var module = angular.module('kibana/directives');

  /**
   * config directive
   *
   * Creates a full width horizonal config section, usually under a nav/subnav.
   * ```
   * <config config-template="configTemplate" config-object="configurable"></config>
   * ```
   */

  module.directive('config', function () {
    return {
      restrict: 'E',
      scope: {
        configTemplate: '=',
        configClose: '=',
        configSubmit: '=',
        configObject: '='
      },
      link: function ($scope) {
        $scope.close = function () {
          if (_.isFunction($scope.configClose)) $scope.configClose();
          $scope.configTemplate = undefined;
        };
      },
      templateUrl: 'kibana/partials/navConfig.html'
    };
  });
});