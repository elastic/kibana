define(function (require) {
  var html = require('text!partials/info.html');

  require('modules')
    .get('kibana')
    .directive('kbnInfo', function () {
      return {
        restrict: 'E',
        scope: {
          info: '@',
          placement: '@'
        },
        template: html,
        link: function ($scope) {
          $scope.placement = $scope.placement || 'top';
        }
      };
    });
});