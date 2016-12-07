import uiModules from 'ui/modules';
import heatmapOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/heatmap_range_option.html';
import colorFunc from 'ui/vislib/components/color/heatmap_color';
const module = uiModules.get('kibana');

module.directive('heatmapOptions', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: heatmapOptionsTemplate,
    replace: true,
    link: function ($scope) {
      $scope.isColorRangeOpen = false;

      $scope.getColor = function (index) {
        const colors = $scope.uiState.get('vis.colors');
        return colors ? Object.values(colors)[index] : 'transparent';
      };

      function fillColorsRange() {
        for (let i = $scope.vis.params.colorsRange.length; i < $scope.vis.params.colorsNumber; i++) {
          $scope.vis.params.colorsRange.push({ value: 0 });
        }
        $scope.vis.params.colorsRange.length = $scope.vis.params.colorsNumber;
      }

      fillColorsRange();
      $scope.$watch('vis.params.colorsNumber', newVal => {
        if (newVal) {
          fillColorsRange();
        }
      });

      $scope.uiState.on('colorChanged', () => {
        $scope.realVis.params.colorSchema = 'custom';
        $scope.vis.params.colorSchema = 'custom';
      });
    }
  };
});
