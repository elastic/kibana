/*jshint globalstrict:true */
/*global angular:true */
/*

  ## Cluster Status

  ### Parameters
  none - yet

*/

'use strict';

angular.module('kibana.clusterhealth', [])
.controller('clusterhealth', ['$scope', function($scope) {

  $scope.panelMeta = {
    status  : "Experimental",
    description : "A status panel for the elasticsearch cluster health"
  };

  var _d = {
    results: {
      cluster_name: "Unknown",
      status: "white",
    },
    lastUpdated: "never",
  };

  _.defaults($scope, _d);

  $scope.init = function() {
    $scope.$on('refresh', function() {
      $scope.get_data();
    });

    $scope.get_data();
  };

  $scope.get_data = function() {
    $scope.panelMeta.loading = true;
    var request = $scope.ejs.client.get('/_cluster/health');

    request.then(function (results) {
       $scope.panelMeta.loading = false;
       $scope.results = results;
       $scope.lastUpdated = new Date().toString();
    });

  };
}]);

