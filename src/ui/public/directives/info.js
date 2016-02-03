import html from 'ui/partials/info.html';
define(function (require) {

  require('ui/modules')
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
