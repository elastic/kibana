/** @scratch /panels/5
 *
 * include::panels/goal.asciidoc[]
 */

/** @scratch /panels/goal/0
 *
 * == Goal
 * Status: *Stable*
 *
 * The goal panel display progress towards a fixed goal on a pie chart
 *
 */
define([
  'angular',
  'app',
  'lodash',
  'jquery',
  'kbn',
  'config',
  'chromath'
], function (angular, app, _, $, kbn) {
  'use strict';

  var module = angular.module('kibana.panels.goal', []);
  app.useModule(module);

  module.controller('goal', function($scope, $rootScope, querySrv, dashboard, filterSrv) {

    $scope.panelMeta = {
      editorTabs : [
        {title:'Queries', src:'app/partials/querySelect.html'}
      ],
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      status  : "Stable",
      description : "Displays the progress towards a fixed goal on a pie chart"
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/goal/3
       *
       * === Parameters
       * donut:: Draw a hole in the middle of the pie, creating a tasty donut.
       */
      donut   : true,
      /** @scratch /panels/goal/3
       * tilt:: Tilt the pie back into an oval shape
       */
      tilt    : false,
      /** @scratch /panels/goal/3
       * legend:: The location of the legend, above, below or none
       */
      legend  : "above",
      /** @scratch /panels/goal/3
       * labels:: Set to false to disable drawing labels inside the pie slices
       */
      labels  : true,
      /** @scratch /panels/goal/3
       * spyable:: Set to false to disable the inspect function.
       */
      spyable : true,
      /** @scratch /panels/goal/3
       *
       * ==== Query
       *
       * query object::
       * query.goal::: the fixed goal for goal mode
       */
      query   : {goal: 100},
      /** @scratch /panels/goal/5
       *
       * ==== Queries
       *
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries     : {
        mode        : 'all',
        ids         : []
      },
    };
    _.defaults($scope.panel,_d);

    $scope.init = function() {
      $scope.$on('refresh',function(){$scope.get_data();});
      $scope.get_data();
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

    $scope.get_data = function() {

      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }


      $scope.panelMeta.loading = true;
      var request = $scope.ejs.Request().indices(dashboard.indices);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      var queries = querySrv.getQueryObjs($scope.panel.queries.ids);

      // This could probably be changed to a BoolFilter
      var boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });

      var results;

      request = request
        .query(boolQuery)
        .filter(filterSrv.getBoolFilter(filterSrv.ids))
        .size(0);

      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);

      results = request.doSearch();

      results.then(function(results) {
        $scope.panelMeta.loading = false;
        var complete  = results.hits.total;
        var remaining = $scope.panel.query.goal - complete;
        $scope.data = [
          { label : 'Complete', data : complete, color: querySrv.colors[parseInt($scope.$id, 16)%8] },
          { data : remaining, color: Chromath.lighten(querySrv.colors[parseInt($scope.$id, 16)%8],0.70).toString() }
        ];
        $scope.$emit('render');
      });
    };

  });

  module.directive('goal', function(querySrv) {
    return {
      restrict: 'A',
      link: function(scope, elem) {

        elem.html('<center><img src="img/load_big.gif"></center>');

        // Receive render events
        scope.$on('render',function(){
          render_panel();
        });

        // Or if the window is resized
        angular.element(window).bind('resize', function(){
          render_panel();
        });

        // Function for rendering panel
        function render_panel() {
          // IE doesn't work without this
          elem.css({height:scope.row.height});

          var label;

          label = {
            show: scope.panel.labels,
            radius: 0,
            formatter: function(label, series){
              var font = parseInt(scope.row.height.replace('px',''),10)/8 + String('px');
              if(!(_.isUndefined(label))) {
                return '<div style="font-size:'+font+';font-weight:bold;text-align:center;padding:2px;color:#fff;">'+
                Math.round(series.percent)+'%</div>';
              } else {
                return '';
              }
            },
          };

          var pie = {
            series: {
              pie: {
                innerRadius: scope.panel.donut ? 0.45 : 0,
                tilt: scope.panel.tilt ? 0.45 : 1,
                radius: 1,
                show: true,
                combine: {
                  color: '#999',
                  label: 'The Rest'
                },
                label: label,
                stroke: {
                  width: 0
                }
              }
            },
            //grid: { hoverable: true, clickable: true },
            grid:   {
              backgroundColor: null,
              hoverable: true,
              clickable: true
            },
            legend: { show: false },
            colors: querySrv.colors
          };

          // Populate legend
          if(elem.is(":visible")){
            require(['jquery.flot.pie'], function(){
              scope.legend = $.plot(elem, scope.data, pie).getData();
              if(!scope.$$phase) {
                scope.$apply();
              }
            });
          }

        }

        var $tooltip = $('<div>');
        elem.bind('plothover', function (event, pos, item) {
          if (item) {
            $tooltip
              .html([
                kbn.query_color_dot(item.series.color, 15),
                (item.series.label || ''),
                parseFloat(item.series.percent).toFixed(1) + '%'
              ].join(' '))
              .place_tt(pos.pageX, pos.pageY, {
                offset: 10
              });
          } else {
            $tooltip.remove();
          }
        });

      }
    };
  });
});