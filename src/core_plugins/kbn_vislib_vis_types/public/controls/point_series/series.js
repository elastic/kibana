import _ from 'lodash';
import uiModules from 'ui/modules';
import vislibSeriesTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series/series.html';
const module = uiModules.get('kibana');

module.directive('vislibSeries', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: vislibSeriesTemplate,
    replace: true,
    link: function ($scope) {
      function makeSerie(label) {
        const last = $scope.series[$scope.series.length - 1];
        return {
          show: true,
          mode: last ? last.mode : 'normal',
          type: last ? last.type : 'line',
          drawLinesBetweenPoints: true,
          showCircles: true,
          smoothLines: false,
          data: {
            label: label
          },
          valueAxis: ''
        };
      }

      $scope.series = $scope.vis.params.seriesParams;
      $scope.$watch(() => {
        return $scope.vis.aggs.map(agg => {
          return agg.params.field ? agg.makeLabel() : '';
        }).join();
      }, () => {
        let serieCount = 0;
        const schemaTitle = $scope.vis.type.schemas.metrics[0].title;
        $scope.vis.aggs.forEach(agg => {
          if (!agg.type) return;
          if (agg.schema.title !== schemaTitle) return;
          if (agg.type.type !== 'metrics') return;
          if ($scope.vis.params.seriesParams[serieCount]) {
            $scope.vis.params.seriesParams[serieCount].data.label = agg.makeLabel();
          } else {
            const serie = makeSerie(agg.makeLabel());
            $scope.vis.params.seriesParams.push(serie);
          }
          serieCount++;
        });
        $scope.vis.params.seriesParams = $scope.vis.params.seriesParams.slice(0, serieCount);
      });

      $scope.$watch(() => {
        return $scope.vis.params.seriesParams.map(series => series.type).join();
      }, () => {
        const types = _.uniq(_.map($scope.vis.params.seriesParams, 'type'));
        $scope.savedVis.type = types.length === 1 ? types[0] : 'histogram';
      });

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
        return newAxis;
      };

      $scope.changeValueAxis = (index) => {
        const series = $scope.vis.params.seriesParams[index];
        if (series.valueAxis === 'new') {
          const axis = $scope.addValueAxis();
          series.valueAxis = axis.id;
          $scope.$parent.$parent.sidebar.section = 'axes';
        }
      };
    }
  };
});
