import { uiModules } from 'ui/modules';
import tableVisParamsTemplate from 'plugins/table_vis/table_vis_params.html';

uiModules.get('kibana/table_vis')
.directive('tableVisParams', function () {
  return {
    restrict: 'E',
    template: tableVisParamsTemplate,
    link: function ($scope) {
      $scope.totalAggregations = ['sum', 'avg', 'min', 'max', 'count'];

      $scope.$watchMulti([
        'vis.params.showPartialRows',
        'vis.params.showMeticsAtAllLevels'
      ], function () {
        if (!$scope.vis) return;

        const params = $scope.vis.params;
        if (params.showPartialRows || params.showMeticsAtAllLevels) {
          $scope.metricsAtAllLevels = true;
        } else {
          $scope.metricsAtAllLevels = false;
        }
      });
    }
  };
});
