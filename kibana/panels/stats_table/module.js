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

    var log_debug;
    if (false) {
      log_debug = function (msg) {
        console.log(msg);
      };
    } else {
      log_debug = function () {
      };
    }

    function y_format_metric_value(value, metric) {
      // If this isn't a number, change nothing
      if (_.isNaN(value) || !_.isFinite(value)) {
        return value;
      }
      if (metric.y_format === 'bytes') {
        return kbn.byteFormat(value, metric.decimals);
      }
      if (metric.y_format === 'short') {
        return kbn.shortFormat(value, metric.decimals);
      }
      return value.toFixed(metric.decimals);
    }

    function stripRaw(fieldName) {
      return fieldName.replace(/\.raw$/, '');
    }

    module.controller('marvel.stats_table', function ($scope, dashboard, filterSrv, esVersion, $filter, alertSrv) {
      $scope.panelMeta = {
        modals: [],
        editorTabs: [],
        status: "Experimental",
        description: "A stats table for nodes or nodes"
      };

      // Set and populate defaults
      var _d = {
        compact: false,
        mode: 'nodes',
        sort: ['__name__', 'asc']
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
            persistent_field: "node.ip_port.raw",
            metrics: [ 'os.cpu.usage', 'os.load_average.1m', 'jvm.mem.heap_used_percent', 'fs.total.available_in_bytes',
              'fs.total.disk_io_op'
            ],
            show_hidden: true
          },
          availableMetrics: [
            {
              name: 'OS CPU (%)',
              field: 'os.cpu.usage',
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
              name: 'JVM Mem (%)',
              field: 'jvm.mem.heap_used_percent',
              warning: 95,
              error: 98
            },
            {
              name: 'Disk Free Space',
              field: 'fs.total.available_in_bytes',
              warning: {
                threshold: 50 * 1024 * 1024 * 1024,
                type: "lower_bound"
              },
              error: {
                threshold: 20 * 1024 * 1024 * 1024,
                type: "lower_bound"
              },
              y_format: "bytes"
            },
            {
              name: 'IOps',
              field: 'fs.total.disk_io_op',
              derivative: true
            }
          ]
        },
        indices: {
          defaults: {
            display_field: null,// identical to index.raw
            persistent_field: 'index.raw',
            metrics: [ 'primaries.docs.count', 'primaries.indexing.index_total', 'total.search.query_total',
              'total.merges.total_size_in_bytes', 'total.fielddata.memory_size_in_bytes'
            ],
            show_hidden: false
          },
          availableMetrics: [
            {
              name: 'Documents',
              field: 'primaries.docs.count',
              decimals: 0,
              y_format: "short"
            },
            {
              name: 'Index Rate',
              field: 'primaries.indexing.index_total',
              derivative: true,
              y_format: "short"
            },
            {
              name: 'Search Rate',
              field: 'total.search.query_total',
              derivative: true,
              y_format: "short"
            },
            {
              name: 'Merge Rate',
              field: 'total.merges.total_size_in_bytes',
              derivative: true,
              y_format: "bytes"
            },
            {
              name: 'Field Data',
              field: 'total.fielddata.memory_size_in_bytes',
              y_format: "bytes"
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

        var _metric_defaults = {field: "", decimals: 1, y_format: "none", derivative: false};
        m = _.defaults(m, _metric_defaults);

        if (_.isNumber(m.error)) {
          m.error = { threshold: m.error, type: "upper_bound"};
        }
        if (_.isNumber(m.warning)) {
          m.warning = { threshold: m.warning, type: "upper_bound"};
        }
        return m;
      };

      _.defaults($scope.panel, $scope.modeInfo[$scope.panel.mode].defaults);


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
      });

      $scope.$watch('(rows|filter:panel.rowFilter).length', function (l) {
        //Compute view based on number of rows
        rowsVsRefresh(l);
      });

      $scope.$watch('dashboard.current.refresh', function () {
        var l = $filter('filter')($scope.rows, $scope.panel.rowFilter).length;
        rowsVsRefresh(l);
      });


      var rowsVsRefresh = function (l) {
        if (l > 5 && kbn.interval_to_seconds(dashboard.current.refresh || '1y') < 120) {
          $scope.panel.compact = true;
          $scope.sparkLines = true;
          $scope.viewSelect = false;
          if(l > 50 && kbn.interval_to_seconds(dashboard.current.refresh || '1y') < 120) {
            dashboard.set_interval('2m');
            alertSrv.set('Refresh rate',
              'Due to the large size of your cluster, the refresh rate has been adjusted to 2m',
              'info',30000);
          }
        } else {
          $scope.viewSelect = true;
          $scope.sparkLines = true;
        }
      };

      $scope.init = function () {
        $scope.dashboard = dashboard;
        $scope.rowLimit = 20;

        $scope.sparkLines = true;
        $scope.viewSelect = true;

        $scope.warnLevels = {};
        $scope.rows = [];
        $scope.$on('refresh', function () {
          $scope.get_rows();
        });
        $scope.get_rows();
      };

      $scope.get_mode_filter = function () {
        return $scope.ejs.TermFilter("_type", $scope.panel.mode === "nodes" ? "node_stats" : "index_stats");
      };


      /*
       marks the start of data retrieval. returns true if retrieval should continue
       or false if not. May schedule future retrival if needed.
       */

      $scope._register_data_start = function () {
        var now = new Date();
        if (!$scope._ongoing_data_retrieval) {
          $scope._ongoing_data_retrieval = now; // mark start.
          log_debug("marking data start for " + now);
          return true;
        }
        if (now - $scope._ongoing_data_retrieval > 60000) {
          console.log("previous data retrieval didn't finish within 1m. executing current request (previous: "
            + $scope._ongoing_data_retrieval + ")");
          $scope._ongoing_data_retrieval = now; // mark start.
          return true;
        }

        if (!$scope._pending_data_retrieval) {
          // queue up, in case this is caused by something important, like an editor change.
          log_debug("queueing data start for " + now);
          $scope._pending_data_retrieval = now;
          // safe guard time out to make sure it happens
          setTimeout(function () {
            if ($scope._pending_data_retrieval === now) {
              // somehow this was not picked up... retry
              console.log("Retrying call from " + now);
              $scope._pending_data_retrieval = null;
              $scope.get_rows();
            }
          }, 20000);
        }

        return false;
      };

      $scope._register_data_end = function () {
        log_debug("end of data retrieval " + $scope._ongoing_data_retrieval);
        if ($scope._pending_data_retrieval) {
          var pending = $scope._pending_data_retrieval;
          setTimeout(function () {
            $scope._ongoing_data_retrieval = null;
            if (pending !== $scope._pending_data_retrieval) {
              log_debug("firing pending retrieval canceled as it was picked up: " + pending);
              return;
            }
            log_debug("firing pending retrieval " + $scope._pending_data_retrieval);
            $scope._pending_data_retrieval = null;
            $scope.get_rows();
          }, 5000); // leave 5 second of some breathing air
        } else {
          $scope._ongoing_data_retrieval = null;

        }
      };


      $scope.get_rows = function () {
        if (dashboard.indices.length === 0) {
          return;
        }

        if (!$scope._register_data_start()) {
          return;
        }

        var
          request,
          filter,
          results,
          facet;

        filter = filterSrv.getBoolFilter(filterSrv.ids);

        var to = filterSrv.timeRange(false).to;
        if (to !== "now") {
          to = kbn.parseDate(to).valueOf() + "||";
        }

        filter.must($scope.get_mode_filter()).must($scope.ejs.RangeFilter('@timestamp').from(to + "-10m/m").to(to + "/m"));

        request = $scope.ejs.Request().indices(dashboard.indices).size(0).searchType("count");
        facet = $scope.ejs.TermsFacet('terms')
          .field($scope.panel.persistent_field)
          .size(9999999)
          .order('term')
          .facetFilter(filter);

        if (!$scope.panel.show_hidden) {
          facet.regex("[^.].*");
        }

        request.facet(facet);

        results = request.doSearch();

        results.then(function (r) {

          var newPersistentIds = _.pluck(r.facets.terms.terms, 'term'),
            mrequest;

          if (newPersistentIds.length === 0) {
            // call the get data function so it will clear out all other data related objects.
            $scope.get_data([]);
            return;
          }

          // in all this cases we don't need the display name, short cut it.
          if (!$scope.panel.display_field || $scope.panel.display_field === $scope.panel.persistent_field ||
              $scope.panel.compact
            ) {
            $scope.get_data(_.map(newPersistentIds, function (id) {
              return {
                display_name: id,
                id: id,
                // using findWhere here, though its not very efficient
                selected: (_.findWhere($scope.rows, {id: id}) || {}).selected
              };
            }));
            return;
          }

          // go get display names.
          mrequest = $scope.ejs.MultiSearchRequest().indices(dashboard.indices);

          _.each(newPersistentIds, function (persistentId) {
            var rowRequest = $scope.ejs.Request().filter(filter);
            rowRequest.query(
              $scope.ejs.ConstantScoreQuery().query(
                $scope.ejs.TermQuery($scope.panel.persistent_field, persistentId)
              )
            );
            rowRequest.size(1).fields(_.unique([ stripRaw($scope.panel.display_field), stripRaw($scope.panel.persistent_field)]));
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
              if (esVersion.gte("1.0.0.RC1")) {
                display_name = (hit.fields[stripRaw($scope.panel.display_field)] || [ undefined ])[0];
                persistent_name = (hit.fields[stripRaw($scope.panel.persistent_field)] || [ undefined] )[0];
              }
              else {
                display_name = hit.fields[stripRaw($scope.panel.display_field)];
                persistent_name = hit.fields[stripRaw($scope.panel.persistent_field)];
              }
              newRows.push({
                display_name: display_name || persistent_name,
                id: persistent_name,
                // using findWhere here, though its not very efficient
                selected: (_.findWhere($scope.rows, {id: persistent_name}) || {}).selected
              });
            });
            $scope.get_data(newRows);
          }, $scope._register_data_end);
        }, $scope._register_data_end);

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
          $scope._register_data_end();
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
            $scope._register_data_end();
          },
          $scope._register_data_end
        );
      };

      var normalizeFacetResults = function (facets, rows, metrics) {
        facets = facets || {}; // deal better with no data.
        _.each(metrics, function (m) {
          _.each(_.pluck(rows, 'id'), function (id) {
            var summary_key = id + "_" + m.field;
            var history_key = id + "_" + m.field + "_history";
            var summary = facets[summary_key];
            if (!summary) {
              // no data for this chart.
              return;
            }
            var series_data = _.pluck(facets[history_key].entries, m.derivative ? 'min' : 'mean');
            var series_time = _.pluck(facets[history_key].entries, 'time');

            if (m.scale && m.scale !== 1) {
              series_data = _.map(series_data, function (v) {
                return v / m.scale;
              });
              summary.mean /= m.scale;
              summary.max /= m.scale;
              summary.min /= m.scale;
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

      $scope.get_sort_value = function (row) {
        if ($scope.panel.sort[0] === '__name__') {
          return row.display_name;
        }
        return $scope.data[row.id + '_' + $scope.panel.sort[0]].mean;
      };

      $scope.set_sort = function (field) {
        if ($scope.panel.sort && $scope.panel.sort[0] === field) {
          $scope.panel.sort[1] = $scope.panel.sort[1] === "asc" ? "desc" : "asc";
        }
        else {
          $scope.panel.sort = [field, 'asc'];
        }
      };

      $scope.showFullTable = function () {
        if ($scope.panel.compact) {
          return false;
        } else {
          return true;
        }
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

      $scope.formatAlert = function (a, metric) {
        return !a ? "" : (a.type === "upper_bound" ? ">" : "<") + y_format_metric_value(a.threshold, metric);
      };

      $scope.detailViewLink = function (rows, fields) {
        var
        query,
        time,
        show,
        from,
        to;

        if (_.isUndefined(rows)) {
          rows = _.where($scope.rows, {selected: true});
        }
        rows = _.map(rows, function (row) {
          query = $scope.panel.persistent_field + ':"' + row.id + '"';
          return {
            q: query,
            a: row.display_name
          };
        });
        if (rows.length === 0) {
          return null;
        }
        rows = JSON.stringify(rows);
        time = filterSrv.timeRange(false);

        if (!_.isUndefined(fields)) {
          show = "&show=" + fields.join(",");
        } else {
          show = "";
        }

        from = _.isDate(time.from) ? time.from.toISOString() : time.from;
        to = _.isDate(time.to) ? time.to.toISOString() : time.to;

        return "#/dashboard/script/marvel." + $scope.panel.mode + "_stats.js?queries=" + encodeUriSegment(rows) + "&from=" +
          from + "&to=" + to + show;
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
          'Select nodes and click to open the nodes dashboard';
      };

      $scope.calculateWarnings = function () {
        $scope.warnLevels = {_global_: {}};
        _.each($scope.panel.metrics, function (metric) {
          $scope.warnLevels._global_[metric.field] = 0;
          _.each(_.pluck($scope.rows, 'id'), function (id) {
            var num, level, summary;

            $scope.warnLevels[id] = $scope.warnLevels[id] || {};

            summary = $scope.data[id + '_' + metric.field];
            if (!summary) {
              return; // no data
            }
            num = summary.mean;
            level = $scope.alertLevel(metric, num);
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

        if (metric.scale) {
          num /= metric.scale;
        }
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

      $scope.addMetric = function (panel,metric) {
        metric = metric || {};
        metric = metricDefaults(metric);
        panel.metrics.push(metric);
        if (!metric.field) {
          // no field defined, got into edit mode..
          $scope.metricEditor.index = panel.metrics.length - 1;
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

      $scope.needs_refresh = function (value) {
        if (_.isUndefined(value)) {
          value = true;
        }
        $scope._needs_refresh = value;
      };

      $scope.close_edit = function () {
        $scope.metricEditor = {
          index: -1
        };
        if ($scope._needs_refresh) {
          $scope.get_rows();
        }
        $scope._needs_refresh = false;
        $scope.$emit('render');
      };

      $scope.deleteMetric = function (panel,index) {
        panel.metrics = _.without(panel.metrics, panel.metrics[index]);
      };


    });

    module.filter('metric_format', function () {
      return y_format_metric_value;
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
            return scope.formatAlert(modelValue, scope);
          });
        }
      };
    });

    module.directive('marvelStatsSparkline', function () {
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

        }
      };
    });


  })
;