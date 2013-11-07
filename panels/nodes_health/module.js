define([
  'angular',
  'app',
  'kbn',
  'underscore',
  'jquery',
  'jquery.flot',
  'jquery.flot.time'
],
  function (angular, app, kbn, _, $) {
    'use strict';

    var module = angular.module('kibana.panels.marvel.nodes_health', []);
    app.useModule(module);

    module.controller('marvel.nodes_health', function ($scope, dashboard, filterSrv) {
      $scope.panelMeta = {
        modals: [],
        editorTabs: [],
        status: "Experimental",
        description: "An overview of cluster health, by node."
      };

      // Set and populate defaults
      var _d = {
        compact: false,
        node_display_field: "node.name", // used as primary display string for a node.
        node_persistent_field: "node.transport_address" // used as node identity - i.e., search queries, facets etc.

      };
      _.defaults($scope.panel, _d);

      $scope.init = function () {
        $scope.warnLevels = {};
        $scope.nodes = [];

        $scope.$on('refresh', function () {
          $scope.get_nodes();
        });

        $scope.get_nodes();

      };

      $scope.get_nodes = function () {
        if (dashboard.indices.length === 0) {
          return;
        }

        var
          request,
          filter,
          results;

        filter = filterSrv.getBoolFilter(filterSrv.ids);

        request = $scope.ejs.Request().indices(dashboard.indices).size(0).searchType("count");
        request.facet(
          $scope.ejs.TermsFacet('terms')
            .field($scope.panel.node_persistent_field)
            .size(9999999)
            .order('term')
            .facetFilter(filter)
        );

        results = request.doSearch();

        results.then(function (r) {
          var newPersistentIds = _.pluck(r.facets.terms.terms, 'term');

          if (newPersistentIds.length === 0) {
            $scope.get_data([]);
            return;
          }

          var mrequest = $scope.ejs.MultiSearchRequest().indices(dashboard.indices);

          _.each(newPersistentIds, function (persistentId) {
            var nodeReqeust = $scope.ejs.Request().filter(filter);
            nodeReqeust.query(
              $scope.ejs.ConstantScoreQuery().query(
                $scope.ejs.TermQuery($scope.panel.node_persistent_field, persistentId)
              )
            );
            nodeReqeust.size(1).fields([ $scope.panel.node_display_field, $scope.panel.node_persistent_field]);
            nodeReqeust.sort("@timestamp", "desc");
            mrequest.requests(nodeReqeust);
          });

          mrequest.doSearch(function (r) {
            var newNodes = [];
            _.each(r.responses, function (nodeResponse) {
              if (nodeResponse.hits.hits.length === 0) {
                return;
              }

              var hit = nodeResponse.hits.hits[0];
              var display_name = hit.fields[$scope.panel.node_display_field];
              var persistent_name = hit.fields[$scope.panel.node_persistent_field];
              newNodes.push({
                display_name: display_name || persistent_name,
                id: persistent_name,
                selected: ($scope.nodes[persistent_name] || {}).selected
              });
            });

            $scope.get_data(newNodes);
          });
        });

      };

      $scope.get_data = function (newNodes) {
        // Make sure we have everything for the request to complete

        if (newNodes === undefined) {
          newNodes = $scope.nodes;
        }

        if (dashboard.indices.length === 0 || newNodes.length === 0) {
          $scope.nodes = newNodes;
          return;
        }

        $scope.panelMeta.loading = true;
        var
          request,
          results;

        $scope.metrics = [
          {
            name: 'CPU (%)',
            field: 'process.cpu.percent',
            warning: 60,
            error: 90,
            decimals: 2
          },
          {
            name: 'Load (1m)',
            field: 'os.load_average.1m',
            warning: 8,
            error: 10,
            decimals: 2
          },
          {
            name: 'System Mem (%)',
            field: 'os.mem.used_percent',
            warning: 90,
            error: 97,
            decimals: 2
          },
          {
            name: 'Jvm Mem (%)',
            field: 'os.mem.used_percent',
            warning: 95,
            error: 98,
            decimals: 2
          },
          {
            name: 'Free disk space (GB)',
            field: 'fs.data.available_in_bytes',
            scale: 1024 * 1024 * 1024,
            warning: { threshold: 5, type: "lower_bound" },
            error: { threshold: 2, type: "lower_bound" },
            decimals: 2
          }
        ];

        _.each($scope.metrics, function (m) {
          _.defaults(m, {scale: 1});
          if (_.isNumber(m.error)) {
            m.error = { threshold: m.error, type: "upper_bound"};
          }
          if (_.isNumber(m.warning)) {
            m.warning = { threshold: m.warning, type: "upper_bound"};
          }
        });

        request = $scope.ejs.Request().indices(dashboard.indices);

        var time = filterSrv.timeRange('last').to;
        time = kbn.parseDate(time).valueOf();
        // Terms mode
        _.each(_.pluck(newNodes, 'id'), function (id) {
          var filter = $scope.ejs.BoolFilter()
            .must($scope.ejs.RangeFilter('@timestamp').from(time + '||-10m/m'))
            .must($scope.ejs.TermsFilter($scope.panel.node_persistent_field, id));

          _.each($scope.metrics, function (m) {
            request = request
              .facet($scope.ejs.StatisticalFacet(id + "_" + m.name)
                .field(m.field || m.name)
                .facetFilter(filter));
            request = request.facet($scope.ejs.DateHistogramFacet(id + "_" + m.name + "_history")
              .keyField('@timestamp').valueField(m.field || m.name).interval('1m')
              .facetFilter(filter)).size(0);
          });
        });

        results = request.doSearch();

        // Populate scope when we have results
        results.then(function (results) {
          $scope.nodes = newNodes;
          $scope.data = results.facets;
          $scope.panelMeta.loading = false;
          $scope.warnLevels = {};
          $scope.calculateWarnings();
        });
      };

      $scope.hasSelected = function (nodes) {
        return _.some(nodes, function (n) {
          return n.selected;
        });
      };

      $scope.metricClick = function (node, metric) {
        var current = window.location.href;
        var i = current.indexOf('#');
        if (i > 0) {
          current = current.substr(0, i);
        }
        current += $scope.detailViewLink([node], [metric.field]);
        window.location = current;
      };

      $scope.detailViewLink = function (nodes, fields) {
        if (nodes === undefined) {
          nodes = _.where($scope.nodes, {selected: true});
        }
        nodes = _.map(nodes, function (node) {
          var query = $scope.panel.node_persistent_field + ':"' + node.id + '"';
          return {
            q: query,
            a: node.display_name
          };
        });
        nodes = JSON.stringify(nodes);
        var time = filterSrv.timeRange(false);
        var show;
        if (fields !== undefined) {
          show = "&show=" + fields.join(",");
        } else {
          show = "";
        }
        return "#/dashboard/script/marvel.node_stats.js?nodes=" + encodeURI(nodes) + "&from=" + time.from + "&to=" + time.to + show;
      };

      $scope.detailViewTip = function () {
        return $scope.hasSelected($scope.nodes) ? 'Open nodes dashboard for selected nodes' :
          'Select nodes and click top open the nodes dashboard';
      };

      $scope.calculateWarnings = function () {
        $scope.warnLevels = {_global_: {}};
        _.each($scope.metrics, function (metric) {
          $scope.warnLevels._global_[metric.name] = 0;
          _.each(_.pluck($scope.nodes, 'id'), function (nodeID) {
            var level = $scope.alertLevel(metric, $scope.data[nodeID + '_' + metric.name].mean);
            $scope.warnLevels[nodeID] = $scope.warnLevels[nodeID] || {};
            $scope.warnLevels[nodeID][metric.name] = level;
            if (level > $scope.warnLevels._global_[metric.name]) {
              $scope.warnLevels._global_[metric.name] = level;
            }
          });
        });
      };

      $scope.alertLevel = function (metric, num) {
        var level = 0;

        function testAlert(alert, num) {
          if (!alert) {
            return false;
          }
          return alert.type === "upper_bound" ? num > alert.threshold : num < alert.threshold;
        }

        num /= metric.scale;
        if (testAlert(metric.error, num)) {
          level = 2;
        } else if (testAlert(metric.warning, num)) {
          level = 1;
        }

        if (document.location.search.match(/panic_demo/)) {
          var r = Math.random();
          if (r > 0.9) {
            level = 2;
          } else if (r > 0.8) {
            level = 1;
          }

        }
        return level;
      };

      $scope.alertClass = function (level) {
        if (level >= 2) {
          return ['text-error'];
        }
        if (level >= 1) {
          return ['text-warning'];
        }
        return [];
      };

    });

    module.directive('marvelNodesHealthChart', function () {
      return {
        restrict: 'C',
        scope: {
          series: '=',
          panel: '='
        },
        template: '<div></div>',
        link: function (scope, elem) {

          // Function for rendering panel
          function render_panel() {
            // Populate element
            var options = {
              legend: { show: false },
              series: {
                lines: {
                  show: true,
                  fill: 0,
                  lineWidth: 2,
                  steps: false
                },
                shadowSize: 1
              },
              yaxis: {
                show: false
              },
              xaxis: {
                show: false,
                mode: "time"
              },
              grid: {
                hoverable: false,
                show: false
              }
            };

            if (!_.isUndefined(scope.series)) {
              var _d = {
                data: _.map(scope.series.entries, function (p) {
                  return [p.time, p.mean];
                }),
                color: elem.css('color')
              };

              $.plot(elem, [_d], options);
            }

          }

          // Receive render events
          scope.$watch('series', function () {
            render_panel();
          });

          // Re-render if the window is resized
          angular.element(window).bind('resize', function () {
            render_panel();
          });

        }
      };
    });


  });