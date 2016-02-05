define(function (require) {
  const _ = require('lodash');

  require('ui/modules').get('kibana/table_vis')
  .directive('tableVisParams', function () {
    return {
      restrict: 'E',
      template: require('plugins/table_vis/table_vis_params.html'),
      link: function ($scope) {
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
});
