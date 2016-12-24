import _ from 'lodash';
import uiModules from 'ui/modules';
import vislibValueAxesTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series/trend_lines.html';
const module = uiModules.get('kibana');

module.directive('vislibTrendLines', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: vislibValueAxesTemplate,
    replace: true,
    link: function ($scope) {
      $scope.addTrendLine = function () {
        const newAxis = {};
        newAxis.id = 'TrendLine-' + $scope.vis.params.trendLines.reduce((value, axis) => {
          if (axis.id.substr(0, 10) === 'TrendLine-') {
            const num = parseInt(axis.id.substr(10));
            if (num >= value) value = num + 1;
          }
          return value;
        }, 1);

        $scope.vis.params.trendLines.push(newAxis);
      };

      $scope.removeTrendLine = function (axis) {
        _.remove($scope.vis.params.trendLines, function (valAxis) {
          return valAxis.id === axis.id;
        });
      };
    }
  };
});
