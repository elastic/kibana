import { uiModules } from 'ui/modules';
import heatmapOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/heatmap_options.html';
import _ from 'lodash';
const module = uiModules.get('kibana');

module.directive('heatmapOptions', function () {
  return {
    restrict: 'E',
    template: heatmapOptionsTemplate,
    replace: true,
    link: function ($scope) {
      const verticalRotation = 270;
      $scope.showColorRange = false;
      $scope.showLabels = false;
      $scope.customColors = false;
      $scope.valueAxis = $scope.vis.params.valueAxes[0];
      $scope.options = {
        rotateLabels: $scope.valueAxis.labels.rotate === verticalRotation
      };

      $scope.$watch('options.rotateLabels', rotate => {
        $scope.vis.params.valueAxes[0].labels.rotate = rotate ? verticalRotation : 0;
      });

      $scope.resetColors = function () {
        $scope.uiState.set('vis.colors', null);
        $scope.customColors = false;
      };

      $scope.toggleColorRangeSection = function (checkbox = false) {
        $scope.showColorRange = !$scope.showColorRange;
        if (checkbox && !$scope.vis.params.setColorRange) $scope.showColorRange = false;
        if (!checkbox && $scope.showColorRange && !$scope.vis.params.setColorRange) $scope.vis.params.setColorRange = true;
      };

      $scope.toggleLabelSection = function (checkbox = false) {
        $scope.showLabels = !$scope.showLabels;
        if (checkbox && !$scope.valueAxis.labels.show) $scope.showLabels = false;
        if ($scope.showLabels && !$scope.valueAxis.labels.show) {
          $scope.vis.params.valueAxes[0].labels.show = true;
        }
      };

      $scope.getGreaterThan = function (index) {
        if (index === 0) return;
        return $scope.vis.params.colorsRange[index - 1].to;
      };

      $scope.addRange = function () {
        const previousRange = _.last($scope.vis.params.colorsRange);
        const from = previousRange ? previousRange.to : 0;
        $scope.vis.params.colorsRange.push({ from: from, to: null });
      };

      $scope.removeRange = function (index) {
        $scope.vis.params.colorsRange.splice(index, 1);
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
