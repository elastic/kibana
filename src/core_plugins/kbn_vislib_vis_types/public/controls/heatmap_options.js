import uiModules from 'ui/modules';
import heatmapOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/heatmap_options.html';
import _ from 'lodash';
const module = uiModules.get('kibana');

module.directive('heatmapOptions', function ($parse, $compile, getAppState) {
  return {
    restrict: 'E',
    template: heatmapOptionsTemplate,
    replace: true,
    link: function ($scope) {
      $scope.isColorRangeOpen = true;
      $scope.customColors = false;
      $scope.options = {
        labels: false
      };

      $scope.$watch('options.labels', rotate => {
        $scope.vis.params.valueAxes[0].labels.rotate = rotate ? 270 : 0;
      });

      $scope.resetColors = () => {
        $scope.uiState.set('vis.colors', null);
        $scope.customColors = false;
      };

      $scope.getGreaterThan = function (index) {
        if (index === 0) return -1;
        return $scope.vis.params.colorsRange[index - 1].to;
      };

      $scope.addRange = function () {
        const previousRange = _.last($scope.vis.params.colorsRange);
        const from = previousRange ? previousRange.to : 0;
        $scope.vis.params.colorsRange.push({from: from, to: null});
        $scope.vis.params.colorsNumber = $scope.vis.params.colorsRange.length;
      };

      $scope.removeRange = function (index) {
        $scope.vis.params.colorsRange.splice(index, 1);
        $scope.vis.params.colorsNumber = $scope.vis.params.colorsRange.length;
      };

      $scope.getColor = function (index) {
        const defaultColors = this.uiState.get('vis.defaultColors');
        const overwriteColors = this.uiState.get('vis.colors');
        const colors = defaultColors ? _.defaults({}, overwriteColors, defaultColors) : overwriteColors;
        return colors ? Object.values(colors)[index] : 'transparent';
      };

      $scope.uiState.on('colorChanged', () => {
        $scope.customColors = true;
      });
    }
  };
});
