define(function (require) {
  var html = require('text!partials/tooltip.html');

  require('modules')
    .get('kibana')
    .directive('kbnTooltip', function () {
      return {
        restrict: 'E',
        template: html,
        transclude: true,
        replace: true,
        scope: true,
        link: function ($scope, $el, attr) {
          $scope.text = attr.text;
          $scope.placement = attr.placement || 'top';
          $scope.delay = attr.delay || 400;
          $scope.appendToBody = attr.appendToBody || 0;
        }
      };
    });
});