/*

  ## Stats Module

  ### Parameters
  * format :: The format of the value returned. (Default: number)
  * style :: The font size of the main number to be displayed.
  * mode :: The aggergate value to use for display
  * spyable ::  Dislay the 'eye' icon that show the last elasticsearch query

*/
define([
  'angular',
  'app',
  'underscore',
  'jquery',
  'kbn',
  'numeral'
], function (
  angular,
  app,
  _,
  $,
  kbn,
  numeral
) {

  'use strict';

  var module = angular.module('kibana.panels.stats', []);
  app.useModule(module);

  module.controller('stats', function ($scope, querySrv, dashboard, filterSrv) {

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
      status: 'Beta',
      description: 'A statatics panel for displaying aggergations using the Elastic Search statistical facet query.'
    };


    var defaults = {
      queries     : {
        mode        : 'all',
        ids         : []
      },
      style   : { "font-size": '24pt'},
      format: 'number',
      mode: 'count',
      display_breakdown: 'yes',
      spyable     : true
    };

    _.defaults($scope.panel, defaults);

    $scope.init = function () {
      $scope.ready = false;
      $scope.$on('refresh', function () {
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.get_data = function () {
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

      request = request
        .facet($scope.ejs.StatisticalFacet('stats')
          .field($scope.panel.field)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              boolQuery,
              filterSrv.getBoolFilter(filterSrv.ids)
              )))).size(0);

      _.each(queries, function (q) {
        var alias = q.alias || q.query;
        var query = $scope.ejs.BoolQuery(); 
        query.should(querySrv.toEjsObj(q));
        request.facet($scope.ejs.StatisticalFacet('stats_'+alias)
          .field($scope.panel.field)
          .facetFilter($scope.ejs.QueryFilter(
            $scope.ejs.FilteredQuery(
              query,
              filterSrv.getBoolFilter(filterSrv.ids)
            )
          ))
        );
      });

      // Populate the inspector panel
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      results = request.doSearch();

      var format = function (format, value) {
        switch (format) {
        case 'money':
          value = numeral(value).format('$0,0.00');
          break;
        case 'bytes':
          value = numeral(value).format('0.00b');
          break;
        case 'float':
          value = numeral(value).format('0.000');
          break;
        default:
          value = numeral(value).format('0,0');
        }
        return value;
      };

      results.then(function(results) {
        $scope.panelMeta.loading = false;
        var value = results.facets.stats[$scope.panel.mode]; 

        var rows = queries.map(function (q) {
          var alias = q.alias || q.query;
          var obj = _.clone(q);
          obj.label = alias;
          obj.value = format($scope.panel.format,results.facets['stats_'+alias][$scope.panel.mode]);
          return obj;
        });

        $scope.data = {
          value: format($scope.panel.format, value),
          rows: rows
        };

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
