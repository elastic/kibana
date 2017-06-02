import { uiModules } from 'ui/modules';
import optionsTemplate from './vis_options.html';
const module = uiModules.get('kibana');

module.directive('circosVisOptions', function () {
  return {
    restrict: 'E',
    template: optionsTemplate,
    replace: true,
    link: function ($scope) {
      function makeSerie(id, label) {
        const last = $scope.series[$scope.series.length - 1];
        return {
          show: true,
          type: last ? last.type : 'line',
          innerRadius: last ? last.outerRadius : 5,
          outerRadius: last ? last.outerRadius + 1 : 6,
          colorSchema: 'OrRd',
          label: label,
          id: id
        };
      }

      $scope.series = $scope.vis.params.seriesParams;
      $scope.$watch(() => {
        return $scope.vis.aggs.map(agg => {
          try {
            return agg.makeLabel();
          } catch (e) {
            return '';
          }
        }).join();
      }, () => {
        const schemaTitle = $scope.vis.type.schemas.metrics[0].title;

        const metrics = $scope.vis.aggs.filter(agg => {
          const isMetric = agg.type && agg.type.type === 'metrics';
          return isMetric && agg.schema.title === schemaTitle;
        });

        // update labels for existing params or create new one
        $scope.vis.params.seriesParams = metrics.map(agg => {
          const params = $scope.vis.params.seriesParams.find(param => param.id === agg.id);
          if (params) {
            params.label = agg.makeLabel();
            return params;
          } else {
            const series = makeSerie(agg.id, agg.makeLabel());
            return series;
          }
        });
      });
    }
  };
});
