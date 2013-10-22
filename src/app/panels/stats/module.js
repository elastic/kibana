/*

  ## Stats

  ### Parameters
  * field: field used to process statistics
  * filter: number format
*/
define([
  'angular',
  'app',
  'underscore',
  'jquery',
  'kbn',
], function (angular, app, _, $, kbn) {
  'use strict';

  var module = angular.module('kibana.panels.stats', []);
  app.useModule(module);

  module.controller('stats', function($scope, querySrv, dashboard, filterSrv) {
    $scope.panelMeta = {
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      editorTabs : [
        {title:'Queries', src:'app/partials/querySelect.html'}
      ],
      status  : "Beta",
      description : "Statistical facet"
    };

    // Set and populate defaults
    var _d = {
      queries     : {
        mode        : 'all',
        ids         : []
      },
      style   : { "font-size": '10pt'},
      field   : null,
      filter  : null,
      spyable : true
    };
    _.defaults($scope.panel,_d);
    

    $scope.init = function () {
      $scope.hits = 0;

      $scope.$on('refresh',function(){
        $scope.get_data();
      });
      $scope.get_data();

    };

    $scope.get_data = function(segment,query_id) {
      delete $scope.panel.error;
      $scope.panelMeta.loading = true;

      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }

      var request,
        results,
        boolQuery;

        
      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      
      request = $scope.ejs.Request().indices(dashboard.indices);
      boolQuery = $scope.ejs.BoolQuery();
      _.each($scope.panel.queries.ids,function(id) {
        boolQuery = boolQuery.should(querySrv.getEjsObj(id));
      });
      
      
      var facet = $scope.ejs.StatisticalFacet('stats');
      if(_.isNull($scope.panel.field)) {
      	  $scope.panel.error = "A field must be specified";
      	  return;
      }
      facet.field($scope.panel.field);
      request = request.facet(facet).size(0);
      request.query(
          boolQuery,
          filterSrv.getBoolFilter(filterSrv.ids)
        );

   
      // Populate the inspector panel
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      // Then run it
      var results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {
        var k = 0;
        $scope.panelMeta.loading = false;
        $scope.count = results.facets.stats.count;
        $scope.total = results.facets.stats.total;
        $scope.mean = results.facets.stats.mean;
        $scope.std_deviation = results.facets.stats.std_deviation;
        $scope.$emit('render');
      });
    };

    $scope.set_refresh = function (state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh =  false;
      $scope.$emit('render');
    };
  });
});