import template from 'ui/partials/info.html';
import { uiModules } from 'ui/modules';

uiModules
  .get('kibana')
  .directive('kbnInfo', function () {
    return {
      restrict: 'E',
      scope: {
        info: '@',
        placement: '@'
      },
      template,
      link: function ($scope) {
        $scope.placement = $scope.placement || 'top';
      }
    };
  });
