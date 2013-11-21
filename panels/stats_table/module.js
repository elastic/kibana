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

    var module = angular.module('kibana.panels.marvel.stats_table', []);
    app.useModule(module);

    module.controller('marvel.stats_table', function ($scope, dashboard, filterSrv) {
      $scope.panelMeta = {
        modals: [],
        editorTabs: [],
        status: "Experimental",
        description: "An overview of cluster health, by node."
      };

      // Set and populate defaults
      var _d = {
        compact: false,
        mode: 'nodes',
      };
      _.defaults($scope.panel, _d);

      // editedMetricIndex was not working because the ng-repeat was creating a new scope.
      // By using metricEditor.index we pass the index property by reference.
      $scope.metricEditor = {
        index: -1,
        add: undefined
      };

      $scope.modeInfo = {
        nodes: {
          defaults: {
            display_field: "node.name",
            persistent_field: "node.transport_address",
            metrics: [ 'process.cpu.percent', 'os.load_average.1m', 'os.mem.used_percent', 'fs.data.available_in_bytes' ]
          },
          availableMetrics: [
            {
              name: 'CPU (%)',
              field: 'process.cpu.percent',
              warning: 60,
              error: 90
            },
            {
              name: 'Load (1m)',
              field: 'os.load_average.1m',
              warning: 8,
              error: 10
            },
            {
              name: 'Jvm Mem (%)',
              field: 'os.mem.used_percent',
              warning: 95,
              error: 98
            },
            {
              name: 'Free disk space (GB)',
              field: 'fs.data.available_in_bytes',
              warning: {
                threshold: 5,
                type: "lower_bound"
              },
              error: {
                threshold: 2,
                type: "lower_bound"
              },
              scale: 1024 * 1024 * 1024
            },
            /* Dropping this until we have error handling for fields that don't exist
             {
             // allow people to add a new, not-predefined metric.
             name: 'Custom',
             field: ''
             }
             */
          ]
        },
        indices: {
          defaults: {
            display_field: null,
            persistent_field: 'index',
            metrics: [ 'primaries.docs.count', 'primaries.indexing.index_total', 'total.search.query_total', 'total.merges.current' ]
          },
          availableMetrics: [
            {
              name: 'Documents',
              field: 'primaries.docs.count',
            },
            {
              name: 'Index Rate',
              field: 'primaries.indexing.index_total',
              derivative: true
            },
            {
              name: 'Search Rate',
              field: 'total.search.query_total',
              derivative: true,
            },
            {
              name: 'Merges',
              field: 'total.merges.current',
            },
            /* Dropping this until we have error handling for fields that don't exist
             {
             // allow people to add a new, not-predefined metric.
             name: 'Custom',
             field: ''
             }
             */
          ]
        }
      };

      var metricDefaults = function (m) {
        if (_.isUndefined($scope.modeInfo[$scope.panel.mode])) {
          return [];
        }
        if (_.isString(m)) {
          m = { "field": m };
        }
        m = _.defaults(m, _.findWhere($scope.modeInfo[$scope.panel.mode].availableMetrics, { "field": m.field }));

        var _metric_defaults = {field: "", decimals: 2, scale: 1};
        m = _.defaults(m, _metric_defaults);

        if (_.isNumber(m.error)) {
          m.error = { threshold: m.error, type: "upper_bound"};
        }
        if (_.isNumber(m.warning)) {
          m.warning = { threshold: m.warning, type: "upper_bound"};
        }

        return m;
      };

      $scope.panel.metrics = _.map($scope.panel.metrics, function (m) {
        return metricDefaults(m);
      });

      $scope.$watch('panel.mode', function (m) {
        if (_.isUndefined(m)) {
          return;
        }
        $scope.panel.display_field = $scope.modeInfo[m].defaults.display_field;
        $scope.panel.persistent_field = $scope.modeInfo[m].defaults.persistent_field;
        $scope.panel.metrics = _.map($scope.modeInfo[m].defaults.metrics, function (m) {
          return metricDefaults(m);
        });
        _.throttle($scope.get_rows(), 500);
      });

      $scope.init = function () {
        $scope.warnLevels = {};
        $scope.rows = [];
        $scope.$on('refresh', function () {
          $scope.get_rows();
        });
      };

      $scope.get_mode_filter = function () {
        return $scope.ejs.TermFilter("_type", $scope.panel.mode === "nodes" ? "node_stats" : "index_stats");
      };

      $scope.get_rows = function () {
        if (dashboard.indices.length === 0) {
          return;
        }

        var
          request,
          filter,
          results;

        filter = filterSrv.getBoolFilter(filterSrv.ids);
        filter.must($scope.get_mode_filter());

        request = $scope.ejs.Request().indices(dashboard.indices).size(0).searchType("count");
        request.facet(
          $scope.ejs.TermsFacet('terms')
            .field($scope.panel.persistent_field)
            .size(9999999)
            .order('term')
            .facetFilter(filter)
        );

        results = request.doSearch();

        results.then(function (r) {
          var newPersistentIds = _.pluck(r.facets.terms.terms, 'term'),
            mrequest;

          if (newPersistentIds.length === 0) {
            // call the get data function so it will clear out all other data related objects.
            $scope.get_data([]);
            return;
          }

          mrequest = $scope.ejs.MultiSearchRequest().indices(dashboard.indices);

          _.each(newPersistentIds, function (persistentId) {
            var rowRequest = $scope.ejs.Request().filter(filter);
            rowRequest.query(
              $scope.ejs.ConstantScoreQuery().query(
                $scope.ejs.TermQuery($scope.panel.persistent_field, persistentId)
              )
            );
            rowRequest.size(1).fields([ $scope.panel.display_field, $scope.panel.persistent_field]);
            rowRequest.sort("@timestamp", "desc");
            mrequest.requests(rowRequest);
          });

          mrequest.doSearch(function (r) {
            var newRows = [],
              hit,
              display_name,
              persistent_name;

            _.each(r.responses, function (response) {
              if (response.hits.hits.length === 0) {
                return;
              }

              hit = response.hits.hits[0];
              display_name = hit.fields[$scope.panel.display_field];
              persistent_name = hit.fields[$scope.panel.persistent_field];

              newRows.push({
                display_name: display_name || persistent_name,
                id: persistent_name,
                selected: ($scope.rows[persistent_name] || {}).selected
              });
            });

            $scope.get_data(newRows);
          });
        });

      };

      $scope.get_data = function (newRows) {
        // Make sure we have everything for the request to complete

        if (_.isUndefined(newRows)) {
          newRows = $scope.rows;
        }

        if (dashboard.indices.length === 0 || newRows.length === 0) {
          $scope.rows = newRows;
          $scope.data = {};
          $scope.panelMeta.loading = false;
          $scope.calculateWarnings();
          return;
        }

        $scope.panelMeta.loading = true;
        var
          request,
          results;

        request = $scope.ejs.Request().indices(dashboard.indices);

        var to = filterSrv.timeRange(false).to;
        if (to !== "now") {
          to = kbn.parseDate(to).valueOf() + "||";
        }

        //to = kbn.parseDate(to).valueOf();
        _.each(_.pluck(newRows, 'id'), function (id) {
          var filter = $scope.ejs.BoolFilter()
            .must($scope.ejs.RangeFilter('@timestamp').from(to + "-10m/m").to(to + "/m"))
            .must($scope.ejs.TermsFilter($scope.panel.persistent_field, id))
            .must($scope.get_mode_filter());

          _.each($scope.panel.metrics, function (m) {
            request = request
              .facet($scope.ejs.StatisticalFacet(id + "_" + m.field)
                .field(m.field)
                .facetFilter(filter));
            request = request.facet($scope.ejs.DateHistogramFacet(id + "_" + m.field + "_history")
              .keyField('@timestamp').valueField(m.field).interval('1m')
              .facetFilter(filter)).size(0);
          });
        });

        results = request.doSearch();

        // Populate scope when we have results
        results.then(function (results) {
          $scope.rows = newRows;
          $scope.data = normalizeFacetResults(results.facets, newRows, $scope.panel.metrics);
          $scope.panelMeta.loading = false;
          $scope.calculateWarnings();
        });
      };

      var normalizeFacetResults = function (facets, rows, metrics) {
        _.each(metrics, function (m) {
          _.each(_.pluck(rows, 'id'), function (id) {
            var summary_key = id + "_" + m.field;
            var history_key = id + "_" + m.field + "_history";
            var summary = facets[summary_key];
            var series_data = _.pluck(facets[history_key].entries, m.derivative ? 'min' : 'mean');
            var series_time = _.pluck(facets[history_key].entries, 'time');

            if (m.scale !== 1) {
              series_data = _.map(series_data, function (v) {
                return v / m.scale;
              });
              summary.mean /= m.scale;
              summary.max /= m.scale;
              summary.max /= m.scale;
            }

            if (m.derivative) {

              var _l = series_data.length - 1;
              if (_l <= 0) {
                summary.mean = null;
              }
              else {
                var avg_time = (series_time[_l] - series_time[0]) / 1000;
                summary.mean = (series_data[_l] - series_data[0]) / avg_time;
              }

              series_data = _.map(series_data, function (p, i) {

                var _v;
                if (i === 0) {
                  _v = null;
                } else {
                  var _t = ((series_time[i] - series_time[i - 1]) / 1000); // milliseconds -> seconds.
                  _v = (p - series_data[i - 1]) / _t;
                }
                return _v;
              });

              summary.max = _.reduce(series_data, function (m, v) {
                return m < v && v != null ? v : m;
              }, Number.NEGATIVE_INFINITY);
              summary.min = _.reduce(series_data, function (m, v) {
                return m > v && v != null ? v : m;
              }, Number.POSITIVE_INFINITY);

            }

            var series = _.zip(series_time, series_data);

            facets[summary_key] = summary;
            facets[history_key].series = series;

          });
        });

        return facets;
      };

      $scope.hasSelected = function (nodes) {
        return _.some(nodes, function (n) {
          return n.selected;
        });
      };

      $scope.rowClick = function (row, metric) {
        var current = window.location.href;
        var i = current.indexOf('#');
        if (i > 0) {
          current = current.substr(0, i);
        }
        current += $scope.detailViewLink([row], metric ? [metric.field] : undefined);
        window.location = current;
      };

      $scope.formatAlert = function (a) {
        return !a ? "" : (a.type === "upper_bound" ? ">" : "<") + a.threshold;
      };



      $scope.detailViewLink = function (rows, fields) {
        if (_.isUndefined(rows)) {
          rows = _.where($scope.rows, {selected: true});
        }
        rows = _.map(rows, function (row) {
          var query = $scope.panel.persistent_field + ':"' + row.id + '"';
          return {
            q: query,
            a: row.display_name
          };
        });
        rows = JSON.stringify(rows);
        var time = filterSrv.timeRange(false);
        var show;
        if (!_.isUndefined(fields)) {
          show = "&show=" + fields.join(",");
        } else {
          show = "";
        }
        return "#/dashboard/script/marvel." + $scope.panel.mode + "_stats.js?queries=" + encodeUriSegment(rows) + "&from=" +
          time.from + "&to=" + time.to + show;
      };

      // stolen from anuglar to have exactly the same url structure and thus no reloads.
      function encodeUriSegment(val) {
        return encodeURIComponent(val).
          replace(/%40/gi, '@').
          replace(/%3A/gi, ':').
          replace(/%24/g, '$').
          replace(/%2C/gi, ',');
      }

      $scope.detailViewTip = function () {
        return $scope.hasSelected($scope.rows) ? 'Open nodes dashboard for selected nodes' :
          'Select nodes and click top open the nodes dashboard';
      };

      $scope.calculateWarnings = function () {
        $scope.warnLevels = {_global_: {}};
        _.each($scope.panel.metrics, function (metric) {
          $scope.warnLevels._global_[metric.field] = 0;
          _.each(_.pluck($scope.rows, 'id'), function (id) {
            var num, level;
            num = $scope.data[id + '_' + metric.field].mean;
            level = $scope.alertLevel(metric, num);
            $scope.warnLevels[id] = $scope.warnLevels[id] || {};
            $scope.warnLevels[id][metric.field] = level;
            if (level > $scope.warnLevels._global_[metric.field]) {
              $scope.warnLevels._global_[metric.field] = level;
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

      $scope.addMetric = function (metric) {
        metric = metricDefaults(metric);
        $scope.panel.metrics.push(metric);
        if (!metric.field) {
          // no field defined, got into edit mode..
          $scope.metricEditor.index = $scope.panel.metrics.length - 1;
        }
      };

      // This is expensive, it would be better to populate a scope object
      $scope.addMetricOptions = function (m) {
        if (_.isUndefined($scope.modeInfo[m])) {
          return [];
        }
        var fields = _.pluck($scope.panel.metrics, 'field');
        return _.filter($scope.modeInfo[m].availableMetrics, function (value) {
          return !_.contains(fields, value.field);
        });
      };

      $scope.close_edit = function () {
        $scope.metricEditor = {
          index: -1
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
          panel: '=',
          field: '='
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
                data: scope.series,
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


  })
;