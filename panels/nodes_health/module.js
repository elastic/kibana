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
        node_persistent_field: "node.transport_address", // used as node identity - i.e., search queries, facets etc.
        metrics: [
          {field: 'process.cpu.percent'},
          {field: 'os.load_average.1m'},
          {field: 'os.mem.used_percent'},
          {field: 'fs.data.available_in_bytes'}
        ]
      };
      _.defaults($scope.panel, _d);

      // editedMetricIndex was not working because the ng-repeat was creating a new scope.
      // By using metricEditor.index we pass the index property by reference.
      $scope.metricEditor = {
        index : -1,
        add : undefined
      };

      // The allowed metrics and their defaults, from which we can create a select list
      $scope.availableMetrics = {
        'process.cpu.percent': {
          name: 'CPU (%)',
          warning: 60,
          error: 90,
        },
        'os.load_average.1m' : {
          name: 'Load (1m)',
          warning: 8,
          error: 10,
        },
        'os.mem.used_percent': {
          name: 'Jvm Mem (%)',
          warning: 95,
          error: 98,
        },
        'fs.data.available_in_bytes' : {
          name: 'Free disk space (GB)',
          warning: { threshold: 5, type: "lower_bound" },
          error: { threshold: 2, type: "lower_bound" },
          scale: 1024 * 1024 * 1024,
        }
      };

      $scope.init = function () {
        $scope.warnLevels = {};
        $scope.nodes = [];

        _.each($scope.panel.metrics, function (m) {
          m = metricDefaults(m);
        });

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

        request = $scope.ejs.Request().indices(dashboard.indices);

        var time = filterSrv.timeRange('last').to;
        time = kbn.parseDate(time).valueOf();
        _.each(_.pluck(newNodes, 'id'), function (id) {
          var filter = $scope.ejs.BoolFilter()
            .must($scope.ejs.RangeFilter('@timestamp').from(time + '||-10m/m'))
            .must($scope.ejs.TermsFilter($scope.panel.node_persistent_field, id));

          _.each($scope.panel.metrics, function (m) {
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

      $scope.formatAlert = function (a) {
        return !a ? "" : (a.type === "upper_bound" ? ">" : "<") + a.threshold;
      };


      $scope.detailViewLink = function (nodes, fields) {
        if (_.isUndefined(nodes)) {
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
        if (!_.isUndefined(fields)) {
          show = "&show=" + fields.join(",");
        } else {
          show = "";
        }
        return "#/dashboard/script/marvel.node_stats.js?nodes=" + encodeURI(nodes) + "&from=" +
          time.from + "&to=" + time.to + show;
      };

      $scope.detailViewTip = function () {
        return $scope.hasSelected($scope.nodes) ? 'Open nodes dashboard for selected nodes' :
          'Select nodes and click top open the nodes dashboard';
      };

      $scope.calculateWarnings = function () {
        $scope.warnLevels = {_global_: {}};
        _.each($scope.panel.metrics, function (metric) {
          $scope.warnLevels._global_[metric.name] = 0;
          _.each(_.pluck($scope.nodes, 'id'), function (nodeID) {
            var level = $scope.alertLevel(metric, ($scope.data[nodeID + '_' + metric.name] || {}).mean);
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


      $scope.parseAlert = function (s) {
        if (!s) {
          return null;
        }
        var ret = { type: "upper_bound"};
        if (s[0] === '<') {
          ret.type = "lower_bound";
          s = s.substr(1);
        } else if (s[0] === '>') {
          s = s.substr(1);
        }

        ret.threshold = parseFloat(s);
        if (isNaN(ret.threshold)) {
          return null;
        }
        return ret;

      };

      var metricDefaults = function(m) {
        var _metric_defaults = {name: "", decimals: 2, scale: 1};
        m = _.defaults({field:m},$scope.availableMetrics[m]);
        m = _.defaults(m, _metric_defaults);

        if (_.isNumber(m.error)) {
          m.error = { threshold: m.error, type: "upper_bound"};
        }
        if (_.isNumber(m.warning)) {
          m.warning = { threshold: m.warning, type: "upper_bound"};
        }

        return m;
      };

      $scope.addMetric = function (metric) {
        metric = metricDefaults(metric);
        $scope.panel.metrics.push(metric);
      };

      $scope.close_edit = function() {
        $scope.metricEditor = {
          index : -1
        };
      };

      $scope.deleteMetric = function (index) {
        $scope.panel.metrics = _.without($scope.panel.metrics, $scope.panel.metrics[index]);
      };


    });

    module.directive('alertValue', function () {
      return {
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) {
          ctrl.$parsers.unshift(function (viewValue) {
            if (/(<>)?\d+(.\d+)?/.test(viewValue)) {
              // it is valid
              ctrl.$setValidity('alertValue', true);
              return scope.parseAlert(viewValue);
            } else {
              // it is invalid, return undefined (no model update)
              ctrl.$setValidity('alertValue', false);
              return undefined;
            }
          });
          ctrl.$formatters.unshift(function (modelValue) {
            return scope.formatAlert(modelValue);
          });
        }
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