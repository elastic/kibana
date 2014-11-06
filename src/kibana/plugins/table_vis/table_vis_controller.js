define(function (require) {
  // get the kibana/table_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('modules').get('kibana/table_vis', ['kibana']);

  // add a controller to tha module, which will transform the esResponse into a
  // tabular format that we can pass to the table directive
  module.controller('KbnTableVisController', function ($scope, Private) {
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));

    $scope.$watch('esResponse', function (resp, oldResp) {
      if (!resp) $scope.tableGroups = null;
      else $scope.tableGroups = tabifyAggResponse($scope.vis, resp);
    });
  });

});