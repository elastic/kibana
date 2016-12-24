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
    }
  };
});
