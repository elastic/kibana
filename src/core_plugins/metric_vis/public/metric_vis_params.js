import { uiModules } from 'ui/modules';
import metricVisParamsTemplate from './metric_vis_params.html';
import _ from 'lodash';
const module = uiModules.get('kibana');

module.directive('metricVisParams', function () {
  return {
    restrict: 'E',
    template: metricVisParamsTemplate,
    replace: true,
    link: function ($scope) {
      $scope.collections = $scope.vis.type.editorConfig.collections;
      $scope.showColorRange = true;

      $scope.$watch('vis.params.metric.metricColorMode', newValue => {
        switch (newValue) {
          case 'Labels':
            $scope.vis.params.metric.style.labelColor = true;
            $scope.vis.params.metric.style.bgColor = false;
            break;
          case 'Background':
            $scope.vis.params.metric.style.labelColor = false;
            $scope.vis.params.metric.style.bgColor = true;
            break;
          case 'None':
            $scope.vis.params.metric.style.labelColor = false;
            $scope.vis.params.metric.style.bgColor = false;
            break;
        }
      });

      $scope.resetColors = function () {
        $scope.uiState.set('vis.colors', null);
        $scope.customColors = false;
      };

      $scope.getGreaterThan = function (index) {
        if (index === 0) return 0;
        return $scope.vis.params.metric.colorsRange[index - 1].to;
      };

      $scope.addRange = function () {
        const previousRange = _.last($scope.vis.params.metric.colorsRange);
        const from = previousRange ? previousRange.to : 0;
        const to = previousRange ? from + (previousRange.to - previousRange.from) : 100;
        $scope.vis.params.metric.colorsRange.push({ from: from, to: to });
      };

      $scope.removeRange = function (index) {
        $scope.vis.params.metric.colorsRange.splice(index, 1);
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
