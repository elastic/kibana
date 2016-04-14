define(function (require) {
  let html = require('ui/partials/info.html');

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
