define(function (require) {
  var angular = require('angular');
  var app     = require('app');
  var _       = require('underscore');
  var $       = require('jquery');
  var kbn     = require('kbn');
  var numeral = require('numeral');

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
      status: 'Experimental',
      description: 'A statatics panel'
    };

    var defaults = {
      queries     : {
        mode        : 'all',
        ids         : []
      },
      style   : { "font-size": '24pt'},
      format: 'number',
      mode: 'count',
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

      // Populate the inspector panel
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      results = request.doSearch();

      results.then(function(results) {
        $scope.panelMeta.loading = false;
        var value = results.facets.stats[$scope.panel.mode]; 
        switch ($scope.panel.format) {
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
        $scope.data = {
          value: value 
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
