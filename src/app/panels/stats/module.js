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
], function (angular, app, _) {
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
      unit    : null,
      count          : true,
      total          : true,
      min            : true,
      max            : true,
      mean           : true,
      sum_of_squares : true,
      variance       : true,
      std_deviation  : true,
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

    $scope.get_data = function() {
      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;
      var request,
        results,
        boolQuery,
        queries;

      request = $scope.ejs.Request().indices(dashboard.indices);
      
      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      queries = querySrv.getQueryObjs($scope.panel.queries.ids);
      
      // This could probably be changed to a BoolFilter
      boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });
      
      if(_.isNull($scope.panel.field)) {
        $scope.panel.error = "A field must be specified";
        return;
      }
      
      // Terms mode
      request = request
        .facet($scope.ejs.StatisticalFacet('stats')
          .field($scope.panel.field)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              boolQuery,
              filterSrv.getBoolFilter(filterSrv.ids)
              )))).size(0);
         
      // Populate the inspector panel
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      // Then run it
      results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {
        $scope.panelMeta.loading = false;
        $scope.count = results.facets.stats.count;
        $scope.total = results.facets.stats.total;
        $scope.min   = results.facets.stats.min;
        $scope.max   = results.facets.stats.max;
        $scope.mean  = results.facets.stats.mean;
        $scope.sum_of_squares  = results.facets.stats.sum_of_squares;
        $scope.variance        = results.facets.stats.variance;
        $scope.std_deviation   = results.facets.stats.std_deviation;
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
    };
  });
});