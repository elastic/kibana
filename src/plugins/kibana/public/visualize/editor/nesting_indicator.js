import _ from 'lodash';
import $ from 'jquery';
import VislibComponentsColorColorPaletteProvider from 'ui/vislib/components/color/color_palette';
import uiModules from 'ui/modules';
uiModules
.get('kibana')
.directive('nestingIndicator', function ($rootScope, $parse, Private) {
  const getColors = Private(VislibComponentsColorColorPaletteProvider);

  return {
    restrict: 'E',
    scope: {
      item: '=',
      list: '='
    },
    link: function ($scope, $el, attr) {
      $scope.$watchCollection('list', function () {
        if (!$scope.list || !$scope.item) return;

        const item = $scope.item;
        const index = $scope.list.indexOf($scope.item);
        const bars = $scope.list.slice(0, index + 1);
        const colors = getColors(bars.length);

        $el.html(bars.map(function (bar, i) {
          return $(document.createElement('span'))
          .css('background-color', colors[i]);
        }));
      });
    }
  };
});
