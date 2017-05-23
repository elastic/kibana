import $ from 'jquery';
import { createColorPalette } from 'ui/vis/components/color/color_palette';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.directive('nestingIndicator', function () {
  return {
    restrict: 'E',
    scope: {
      item: '=',
      list: '='
    },
    link: function ($scope, $el) {
      $scope.$watchCollection('list', function () {
        if (!$scope.list || !$scope.item) return;

        const index = $scope.list.indexOf($scope.item);
        const bars = $scope.list.slice(0, index + 1);
        const colors = createColorPalette(bars.length);

        $el.html(bars.map(function (bar, i) {
          return $(document.createElement('span'))
          .css('background-color', colors[i]);
        }));
      });
    }
  };
});
