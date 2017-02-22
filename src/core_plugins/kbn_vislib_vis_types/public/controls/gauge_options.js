import uiModules from 'ui/modules';
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
          case 'Meter':
            $scope.vis.params.gauge.type = 'meter';
            $scope.vis.params.gauge.minAngle = undefined;
            $scope.vis.params.gauge.maxAngle = undefined;
            break;
          case 'Circle':
            $scope.vis.params.gauge.type = 'meter';
            $scope.vis.params.gauge.minAngle = 0;
            $scope.vis.params.gauge.maxAngle = 2 * Math.PI;
            break;
        }
      });

      $scope.$watch('vis.params.gauge.gaugeStyle', style => {
        switch (style) {
          case 'Full':
            $scope.vis.params.gauge.style.mask = false;
            break;
          case 'Bars':
            $scope.vis.params.gauge.style.mask = true;
            $scope.vis.params.gauge.style.maskBars = 50;
            $scope.vis.params.gauge.style.maskPadding = 0.04;
            break;
          case 'Lines':
            $scope.vis.params.gauge.style.mask = true;
            $scope.vis.params.gauge.style.maskBars = 200;
            $scope.vis.params.gauge.style.maskPadding = 0.2;
            break;
        }
      });

      $scope.$watch('vis.params.gauge.backStyle', style => {
        switch (style) {
          case 'Full':
            $scope.vis.params.gauge.style.bgMask = false;
            break;
          case 'Bars':
            $scope.vis.params.gauge.style.bgMask = true;
            $scope.vis.params.gauge.style.bgMaskBars = 50;
            $scope.vis.params.gauge.style.bgMaskPadding = 0.04;
            break;
          case 'Lines':
            $scope.vis.params.gauge.style.bgMask = true;
            $scope.vis.params.gauge.style.bgMaskBars = 200;
            $scope.vis.params.gauge.style.bgMaskPadding = 0.2;
            break;
        }
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
