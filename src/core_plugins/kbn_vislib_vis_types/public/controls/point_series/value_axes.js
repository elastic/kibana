import _ from 'lodash';
import uiModules from 'ui/modules';
import vislibValueAxesTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series/value_axes.html';
const module = uiModules.get('kibana');

module.directive('vislibValueAxes', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: vislibValueAxesTemplate,
    replace: true,
    link: function ($scope) {
      let isCategoryAxisHorizontal = true;
      $scope.rotateOptions = [
        { name: 'horizontal', value: 0 },
        { name: 'vertical', value: 90 },
        { name: 'angled', value: 75 },
      ];


      $scope.$watch('vis.params.categoryAxes[0].position', position => {
        isCategoryAxisHorizontal = ['top', 'bottom'].includes(position);
      });

      $scope.getSeries = function (axis) {
        const isFirst = $scope.vis.params.valueAxes[0] === axis;
        const series = _.filter($scope.vis.params.seriesParams, series => {
          return series.valueAxis === axis.id || (isFirst && !series.valueAxis);
        });
        return series.map(series => series.data.label).join(', ');
      };

      $scope.getSeriesShort = function (axis) {
        const maxStringLength = 30;
        return $scope.getSeries(axis).substring(0, maxStringLength);
      };

      $scope.isPositionDisabled = function (position) {
        if (isCategoryAxisHorizontal) {
          return ['top', 'bottom'].includes(position);
        }
        return ['left', 'right'].includes(position);
      };

      $scope.addValueAxis = function () {
        const newAxis = _.cloneDeep($scope.vis.params.valueAxes[0]);
        newAxis.id = 'ValueAxis-' + $scope.vis.params.valueAxes.reduce((value, axis) => {
          if (axis.id.substr(0, 10) === 'ValueAxis-') {
            const num = parseInt(axis.id.substr(10));
            if (num >= value) value = num + 1;
          }
          return value;
        }, 1);

        $scope.vis.params.valueAxes.push(newAxis);
      };

      $scope.removeValueAxis = function (axis) {
        if ($scope.vis.params.valueAxes.length > 1) {
          _.remove($scope.vis.params.valueAxes, function (valAxis) {
            return valAxis.id === axis.id;
          });
        }
      };

      $scope.updateExtents = function (axis) {
        if (!axis.scale.setYExtents) {
          delete axis.scale.min;
          delete axis.scale.max;
        }
      };

      const lastAxisTitles = {};
      $scope.$watch(() => {
        return $scope.vis.aggs.map(agg => {
          return agg.params.field ? agg.makeLabel() : '';
        }).join();
      }, () => {
        $scope.vis.params.valueAxes.forEach((axis, i) => {
          let label = '';
          const matchingSeries = [];
          $scope.vis.params.seriesParams.forEach(series => {
            const isMatchingSeries = (i === 0 && !series.valueAxis) || (series.valueAxis === axis.id);
            if (isMatchingSeries) {
              let seriesNumber = 0;
              $scope.vis.aggs.forEach(agg => {
                if (agg.schema.name === 'metric') {
                  if (seriesNumber === i) matchingSeries.push(agg);
                  seriesNumber++;
                }
              });
            }
          });
          if (matchingSeries.length === 1) {
            label = matchingSeries[0].makeLabel();
          }
          if (lastAxisTitles[axis.id] !== label) {
            lastAxisTitles[axis.id] = label;
            axis.title.text = label;
          }
        });
      });
    }
  };
});
