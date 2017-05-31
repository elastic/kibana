import { uiModules } from 'ui/modules';
import gaugeOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/gauge_options.html';
import _ from 'lodash';
const module = uiModules.get('kibana');

module.directive('gaugeOptions', function () {
  return {
    restrict: 'E',
    template: gaugeOptionsTemplate,
    replace: true,
    link: function ($scope) {

      $scope.showColorRange = true;

      $scope.$watch('vis.params.gauge.gaugeType', type => {
        switch (type) {
          case 'Arc':
            $scope.vis.params.gauge.type = 'meter';
            $scope.vis.params.gauge.minAngle = undefined;
            $scope.vis.params.gauge.maxAngle = undefined;
            break;
          case 'Circle':
            $scope.vis.params.gauge.type = 'meter';
            $scope.vis.params.gauge.minAngle = 0;
            $scope.vis.params.gauge.maxAngle = 2 * Math.PI;
            break;
          case 'Metric':
            $scope.vis.params.gauge.type = 'simple';
        }
      });


      const updateLegend = () => {
        if (!$scope.vis.params.gauge.style.bgColor && !$scope.vis.params.gauge.style.labelColor) {
          $scope.vis.params.addLegend = false;
        } else {
          $scope.vis.params.addLegend = true;
        }
      };

      $scope.$watch('vis.params.gauge.gaugeColorMode', newValue => {
        switch (newValue) {
          case 'Labels':
            $scope.vis.params.gauge.style.labelColor = true;
            $scope.vis.params.gauge.style.bgColor = false;
            break;
          case 'Background':
            $scope.vis.params.gauge.style.labelColor = false;
            $scope.vis.params.gauge.style.bgColor = true;
            break;
          case 'None':
            $scope.vis.params.gauge.style.labelColor = false;
            $scope.vis.params.gauge.style.bgColor = false;
            break;
        }
        updateLegend();
      });

      $scope.resetColors = function () {
        $scope.uiState.set('vis.colors', null);
        $scope.customColors = false;
      };

      $scope.getGreaterThan = function (index) {
        if (index === 0) return 0;
        return $scope.vis.params.gauge.colorsRange[index - 1].to;
      };

      $scope.addRange = function () {
        const previousRange = _.last($scope.vis.params.gauge.colorsRange);
        const from = previousRange ? previousRange.to : 0;
        const to = previousRange ? from + (previousRange.to - previousRange.from) : 100;
        $scope.vis.params.gauge.colorsRange.push({ from: from, to: to });
      };

      $scope.removeRange = function (index) {
        $scope.vis.params.gauge.colorsRange.splice(index, 1);
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
