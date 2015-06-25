define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/table_vis')
  .directive('tableVisParams', function () {
    return {
      restrict: 'E',
      template: require('text!plugins/table_vis/table_vis_params.html'),
      link: function ($scope) {
        $scope.$watchMulti([
          'vis.params.showPartialRows',
          'vis.params.showMeticsAtAllLevels'
        ], function () {
          if (!$scope.vis) return;

          var params = $scope.vis.params;
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