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
  'lodash',
  'jquery',
  'kbn',
  'numeral',
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

  module.controller('stats', function ($scope, $q, querySrv, dashboard, filterSrv) {

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
      description: 'A statistical panel for displaying aggregations using the Elastic Search statistical facet query.'
    };

    $scope.modes = ['count','min','max','mean','total','variance','std_deviation','sum_of_squares','last_value'];

    var defaults = {
      queries     : {
        mode        : 'all',
        ids         : []
      },
      style   : { "font-size": '24pt'},
      format: 'number',
      mode: 'count',
      display_breakdown: 'yes',
      sort_field: '',
      sort_reverse: false,
      label_name: 'Query',
      value_name: 'Value',
      time_field: '@timestamp',
      spyable     : true,
      show: {
        count: true,
        min: true,
        max: true,
        mean: true,
        std_deviation: true,
        sum_of_squares: true,
        total: true,
        variance: true,
        last_value: true
      }
    };

    _.defaults($scope.panel, defaults);

    $scope.init = function () {
      $scope.ready = false;
      $scope.$on('refresh', function () {
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.set_sort = function(field) {
      console.log(field);
      if($scope.panel.sort_field === field && $scope.panel.sort_reverse === false) {
        $scope.panel.sort_reverse = true;
      } else if($scope.panel.sort_field === field && $scope.panel.sort_reverse === true) {
        $scope.panel.sort_field = '';
        $scope.panel.sort_reverse = false;
      } else {
        $scope.panel.sort_field = field;
        $scope.panel.sort_reverse = false;
      }
    };

    $scope.get_data = function () {
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;

      var request,
        results,
        boolQuery,
        queries,
        multiSearchRequest,
        multiSearchResults;

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
              filterSrv.getBoolFilter(filterSrv.ids())
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
              filterSrv.getBoolFilter(filterSrv.ids())
            )
          ))
        );
      });

      // Populate the inspector panel
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      // Multisearch query to get the last_value field
      multiSearchRequest = $scope.ejs.MultiSearchRequest();
      _.each(queries, function(q) {
        var boolQuery = $scope.ejs.BoolQuery();
        var request = $scope.ejs.Request().indices(dashboard.indices);
        boolQuery.should(querySrv.toEjsObj(q));
        request.query($scope.ejs.FilteredQuery(boolQuery))
          .fields($scope.panel.field)
          .filter($scope.ejs.ExistsFilter($scope.panel.field))
          .sort($scope.ejs.Sort($scope.panel.time_field).ignoreUnmapped(true).desc())
          .size(1);

        multiSearchRequest.requests(request);
      })

      results = request.doSearch();
      multiSearchResults = multiSearchRequest.doSearch();

      // We finish till the end of these two functions
      $q.all([results, multiSearchResults]).then(function(results) {
        var stats_results = results[0];
        var last_value_results = results[1];

        $scope.panelMeta.loading = false;

        // We only show 'last_value' in the featured stat if we have more than 1 query
        if ($scope.panel.mode != 'last_value') {
          var value = stats_results.facets.stats[$scope.panel.mode];
        } else if (queries.length > 1) {
          var value = '-';
        } else {
          var value = last_value_results.responses[0].hits.hits[0].fields[$scope.panel.field][0];
        }

        var rows = queries.map(function (q) {
          var alias = q.alias || q.query;
          var obj = _.clone(q);
          obj.label = alias;
          obj.Label = alias.toLowerCase(); //sort field
          try {
            obj.value = stats_results.facets['stats_'+alias];
            obj.Value = stats_results.facets['stats_'+alias]; //sort field
          } catch (TypeError) {
            // In the case that we have a
            obj.value = {};
            obj.Value = {};
          }
          return obj;
        });

        // We add the last_value to the stats
        for(var i = 0, len = queries.length; i < len; i++) {
            rows[i].value['last_value'] = rows[i].value['last_value'] = last_value_results.responses[i].hits.hits[0].fields[$scope.panel.field][0];
        }

        $scope.data = {
          value: value,
          rows: rows
        };

        console.log($scope.data);

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

  module.filter('formatstats', function(){
    return function (value,format) {
      switch (format) {
      case 'money':
        if (!isNaN(value)) {
          value = numeral(value).format('$0,0.00');
        }
        break;
      case 'bytes':
        if (!isNaN(value)) {
          value = numeral(value).format('0.00b');
        }
        break;
      case 'float':
        if (!isNaN(value)) {
          value = numeral(value).format('0.000');
        }
        break;
      default:
        if (!isNaN(value)) {
          value = numeral(value).format('0,0');
        }
      }
      return value;
    };
  });

});
