import _ from 'lodash';
import $ from 'jquery';
import 'ui/directives/inequality';
import uiModules from 'ui/modules';
import pointSeriesOptionsTemplate from 'plugins/kbn_vislib_vis_types/controls/point_series_options.html';
const module = uiModules.get('kibana');

module.directive('pointSeriesOptions', function ($parse, $compile) {
  return {
    restrict: 'E',
    template: pointSeriesOptionsTemplate,
    replace: true,
    link: function ($scope, $el) {
      $scope.showSeperateYAxisOption = () => {
        const result = (() => {
          if ($scope.vis.params.setYExtents || $scope.vis.params.defaultYExtents) return false;
          if ($scope.vis.type.name === 'histogram' && $scope.vis.params.mode !== 'grouped') return false;
          if ($scope.vis.type.name === 'area') return false;

          let metrics = 0;
          let buckets = 0;
          _.map($scope.vis.aggs, agg => {
            if (agg.type && agg.type.type === 'metrics') metrics++;
            else buckets++;
          });

          if (metrics < 2 || buckets !== 1) return false;
          return true;
        })();

        if (result === false) {
          $scope.vis.params.splitYAxis = false;
        }

        return result;
      };
    }
  };
});
