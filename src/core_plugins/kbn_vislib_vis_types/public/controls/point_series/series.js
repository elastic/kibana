import _ from 'lodash';
import { uiModules } from 'ui/modules';
import vislibSeriesTemplate from './series.html';
const module = uiModules.get('kibana');

module.directive('vislibSeries', function () {
  return {
    restrict: 'E',
    template: vislibSeriesTemplate,
    replace: true,
    link: function ($scope) {
      function makeSerie(id, label) {
        const last = $scope.series[$scope.series.length - 1];
        return {
          show: true,
          mode: last ? last.mode : 'normal',
          type: last ? last.type : 'line',
          drawLinesBetweenPoints: last ? last.drawLinesBetweenPoints : true,
          showCircles: last ? last.showCircles : true,
          interpolate: last ? last.interpolate : 'linear',
          lineWidth: last ? last.lineWidth : 2,
          data: {
            id: id,
            label: label
          },
          valueAxis: last ? last.valueAxis : $scope.vis.params.valueAxes[0].id
        };
      }

      $scope.series = $scope.vis.params.seriesParams;
      $scope.$watch(() => {
        return $scope.vis.aggs.map(agg => {
          return agg.makeLabel();
        }).join();
      }, () => {
        const schemaTitle = $scope.vis.type.schemas.metrics[0].title;

        const metrics = $scope.vis.aggs.filter(agg => {
          const isMetric = agg.type && agg.type.type === 'metrics';
          return isMetric && agg.schema.title === schemaTitle;
        });

        // update labels for existing params or create new one
        $scope.vis.params.seriesParams = metrics.map(agg => {
          const params = $scope.vis.params.seriesParams.find(param => param.data.id === agg.id);
          if (params) {
            params.data.label = agg.makeLabel();
            return params;
          } else {
            const series = makeSerie(agg.id, agg.makeLabel());
            return series;
          }
        });
      });

      $scope.$watch(() => {
        return $scope.vis.params.seriesParams.map(series => series.type).join();
      }, () => {
        const types = _.uniq(_.map($scope.vis.params.seriesParams, 'type'));
        $scope.vis.type.type = types.length === 1 ? types[0] : 'histogram';
      });

      $scope.$watch('vis.params.valueAxes.length', () => {
        $scope.vis.params.seriesParams.forEach(series => {
          if (!$scope.vis.params.valueAxes.find(axis => axis.id === series.valueAxis)) {
            series.valueAxis = $scope.vis.params.valueAxes[0].id;
          }
        });
      });

      $scope.changeValueAxis = (index) => {
        const series = $scope.vis.params.seriesParams[index];
        if (series.valueAxis === 'new') {
          const axis = $scope.addValueAxis();
          series.valueAxis = axis.id;
        }
        $scope.updateAxisTitle();
      };
    }
  };
});
