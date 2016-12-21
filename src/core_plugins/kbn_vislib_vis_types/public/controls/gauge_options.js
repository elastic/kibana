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


    }
  };
});
