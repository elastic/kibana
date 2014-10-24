define(function (require) {
  require('css!plugins/table_vis/styles/table_vis.css');

  require('modules')
  .get('kibana/table_vis', ['kibana'])
  .controller('TableVisController', function ($scope, Private) {
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify_agg_response'));

    $scope.$watch('esResponse', function (resp, oldResp) {
      if (!resp) {
        $scope.tableData = null;
        return;
      }

      $scope.tableData = tabifyAggResponse($scope.vis, $scope.esResponse);
    });
  });

});