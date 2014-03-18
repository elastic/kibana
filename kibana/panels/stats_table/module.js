define([
  'angular',
  'app',
  'kbn',
  'lodash',
  'jquery',
  'numeral',
  'jquery.flot',
  'jquery.flot.time'
],
  function (angular, app, kbn, _, $, numeral) {
    'use strict';

    var module = angular.module('kibana.panels.marvel.stats_table', []);
    app.useModule(module);

    // Customize the output of Numeral here.
    numeral.language('en', {
      delimiters: {
        thousands: ',',
        decimal: '.'
      },
      abbreviations: {
        thousand: 'K',
        million: 'M',
        billion: 'B',
        trillion: 'T'
      },
      currency: {
        symbol: '$'  
      }
    });

    var log_debug;
    if (false) {
      log_debug = function (msg) {
        console.log(msg);
      };
    }
    else {
      log_debug = function () {
      };
    }

    function y_format_metric_value(value, metric) {
      // If this isn't a number, change nothing
      if (_.isNaN(value) || !_.isFinite(value) || !_.isNumber(value)) {
        return value;
      }
      if (metric.y_format === 'bytes') {
        return numeral(value).format('0.0 b');
      }
      if (metric.y_format === 'short') {
        return numeral(value).format('0.0 a');
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
        status: "Stable",
        description: "A stats table for nodes or nodes"
      };

      // Set and populate defaults
      var _d = {
        compact: false,
        mode: 'nodes',
        sort: null,
        // if you have more rows than this number, full view will be disabled
        full_view_row_limit_on_high_refresh: 5,
        // if you have more nodes/indices than this number, refresh rate will be capped at 2,
        data_limit_for_high_refresh: 50,
        // disable display names if more than this number of nodes/indices.
        data_limit_for_display_names: 50
        //
      };
      _.defaults($scope.panel, _d);

      // editedMetricIndex was not working because the ng-repeat was creating a new scope.
      // By using metricEditor.index we pass the index property by reference.
      $scope.metricEditor = {
        index: -1,
        add: undefined
      };

      $scope.staleIntervalCount = 5;

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
              warning: 90,
              error: 95
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

      $scope.$watch('panel.mode', function (m, prev) {
        if (m === prev || _.isUndefined(m)) {
          return;
        }
        $scope.panel.display_field = $scope.modeInfo[m].defaults.display_field;
        $scope.panel.persistent_field = $scope.modeInfo[m].defaults.persistent_field;
        $scope.panel.metrics = _.map($scope.modeInfo[m].defaults.metrics, function (m) {
          return metricDefaults(m);
        });
      });

      $scope.$watch('dashboard.current.refresh', function () {
        $scope.updateUIFeaturesBasedOnData();
      });


      $scope.updateUIFeaturesBasedOnData = function () {
        var l = $scope.rows.length;
        if (l > $scope.panel.full_view_row_limit_on_high_refresh
          && kbn.interval_to_seconds(dashboard.current.refresh || '1y') < 120) {
          $scope.panel.compact = true;
          $scope.sparkLines = true;
          $scope.viewSelect = false;
        }
        else {
          $scope.viewSelect = true;
          $scope.sparkLines = true;
        }
        if (_.size($scope.data) > $scope.panel.data_limit_for_high_refresh
          && kbn.interval_to_seconds(dashboard.current.refresh || '1y') < 120) {
          dashboard.set_interval('2m');
          alertSrv.set('Refresh rate',
            'Due to the large size of your cluster, the refresh rate has been adjusted to 2m',
            'info', 30000);
        }

      };

      $scope.init = function () {
        $scope.dashboard = dashboard;
        $scope.rowLimit = 20;

        $scope.sparkLines = true;
        $scope.viewSelect = true;

        $scope.warnLevels = {};
        $scope.rows = [];
        $scope.data = {};
        $scope.$on('refresh', function () {
          $scope.get_data();
        });
        $scope.get_data();
      };

      $scope.get_mode_filter = function () {
        return $scope.ejs.TermFilter("_type", $scope.panel.mode === "nodes" ? "node_stats" : "index_stats");
      };

      $scope.get_summary_key = function (id, m) {
        return id + "_" + m.field;
      };

      $scope.get_history_key = function (id, m) {
        return id + "_" + m.field + "_history";
      };

      /*
       marks the start of data retrieval. returns true if retrieval should continue
       or false if not. May schedule future retrieval if needed.
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
              $scope.get_data();
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
            $scope.get_data();
          }, 5000); // leave 5 second of some breathing air
        }
        else {
          $scope._ongoing_data_retrieval = null;

        }
      };


      $scope.get_data = function () {
        if (dashboard.indices.length === 0) {
          return;
        }

        if (!$scope._register_data_start()) {
          return;
        }

        $scope.panel.error = false;

        var
          request,
          filter,
          results;

        filter = filterSrv.getBoolFilter(filterSrv.ids);

        var maxFilterTime, to;
        maxFilterTime = to = filterSrv.timeRange(false).to;
        maxFilterTime = kbn.parseDate(maxFilterTime).getTime();
        if (to !== "now") {
          to = kbn.parseDate(to).valueOf() + "||";
        }

        filter.must($scope.get_mode_filter()).must($scope.ejs.RangeFilter('@timestamp').from(to + "-10m/m").to(to + "/m"));

        request = $scope.ejs.Request().indices(dashboard.indices).size(10);
        request.query($scope.ejs.FilteredQuery($scope.ejs.MatchAllQuery(), filter));

        // timestamp facet to give us the proper time ranges for each node
        request.facet($scope.ejs.TermStatsFacet("timestamp")
          .keyField($scope.panel.persistent_field).valueField("@timestamp")
          .order('term')
          .size(2000));

        // master node detection
        if ($scope.panel.mode === "nodes") {
          request.facet($scope.ejs.TermStatsFacet("master_periods")
            .keyField($scope.panel.persistent_field).valueField("@timestamp")
            .order('term').facetFilter($scope.ejs.TermFilter("node.master", "true"))
            .size(2000));

        }

        _.each($scope.panel.metrics, function (m) {
          request.facet($scope.ejs.TermStatsFacet(m.field)
            .keyField($scope.panel.persistent_field).valueField(m.field)
            .order('term')
            .size(2000));
        });

        results = request.doSearch();

        results.then(function (r) {

          var mrequest, newData;

          // populate the summary data based on the other facets
          newData = {};

          // Check for error and abort if found
          if(!(_.isUndefined(r.error))) {
            $scope.panel.error = $scope.parse_error(r.error);
            return;
          }

          _.each(r.facets['timestamp'].terms, function (f) {
            if (!$scope.panel.show_hidden && f.term[0] === ".") {
              return;
            }
            var t_interval = (f.max - f.min) / f.count / 1000.0,
              data_age_in_seconds = (maxFilterTime - f.max) / 1000.0;

            if (t_interval <= 0) {
              t_interval = 5;
            }
            var alive = data_age_in_seconds < Math.min(300 * 1000, $scope.staleIntervalCount * t_interval);
            newData[f.term] = {
              id: f.term,
              time_span: (f.max - f.min) / 1000,
              reporting_interval: t_interval / 1000,
              data_age_in_seconds: data_age_in_seconds,
              data_age_display: kbn.secondsToHms(Math.floor(data_age_in_seconds)),
              alive: alive,
              selected: ($scope.data[f.term] || {}).selected,
              alert_level: 0,
              id_alert_level: alive ? 0 : 1
            };
          });

          if (r.facets['master_periods']) {
            var most_recent_master = _.max(r.facets['master_periods'].terms, function (f) {
              return f.max;
            });
            newData[most_recent_master.term].master = true;
            // now check we have other active master within the same time frame
            var other_masters = _.filter(r.facets['master_periods'].terms, function (t) {
              if (t.term === most_recent_master.term) {
                return false;
              }
              if (maxFilterTime - t.max > $scope.staleIntervalCount * newData[t.term].reporting_interval * 1000) {
                // stale master info, we don't care.
                return false;
              }
              // enough of overlap to not be a master swap
              return (t.max - most_recent_master.min >
                Math.min(300 * 1000, $scope.staleIntervalCount * newData[t.term].reporting_interval * 1000));
            });
            _.each(other_masters, function (t) {
              newData[t.term].master = true;
            });
            if (other_masters.length > 0) {
              // mark all master nodes as alerting
              _.each(newData, function (n) {
                if (n.master) {
                  n.alert_level = n.id_alert_level = 2;
                }
              });
            }
          }

          _.each($scope.panel.metrics, function (m) {
            _.each(r.facets[m.field].terms, function (f) {
              var summary = newData[f.term];
              if (!summary) {
                return; // filtered
              }
              var m_summary = {
                mean: null,
                max: null,
                min: null
              };

              if (m.derivative) {
                // no min max, but we can do avg, if we have a timestamp
                if (!summary.time_span) {
                  summary[m.field] = m_summary;
                  return;
                }
                m_summary.value = (f.max - f.min) / summary.time_span;
                if (m.scale && m.scale !== 1) {
                  m_summary.value /= m.scale;
                }
              }
              else {
                m_summary.min = f.min;
                m_summary.max = f.max;
                m_summary.value = f.mean;
                if (m.scale && m.scale !== 1) {
                  m_summary.value /= m.scale;
                  m_summary.max /= m.scale;
                  m_summary.min /= m.scale;
                }
              }
              summary[m.field] = m_summary;
              m_summary.alert_level = $scope.alertLevel(m, m_summary.value);
              if (m_summary.alert_level > summary.alert_level) {
                summary.alert_level = m_summary.alert_level;
              }
            });
          });


          if (_.isEmpty(newData)) {
            // call the get data function so it will clear out all other data related objects.
            $scope._register_data_end();
            $scope.select_display_data_and_enrich(newData);
            return;
          }

          // in all this cases we don't need the display name, short cut it.
          if (!$scope.panel.display_field || $scope.panel.display_field === $scope.panel.persistent_field ||
            _.size(newData) > $scope.panel.data_limit_for_display_names
            ) {
            _.each(newData, function (s) {
              s.display_name = s.id;
            });
            $scope._register_data_end();

            $scope.select_display_data_and_enrich(newData);
            return;
          }

          // go get display names.
          mrequest = $scope.ejs.MultiSearchRequest().indices(dashboard.indices);

          _.each(newData, function (s) {
            var rowRequest = $scope.ejs.Request().filter(filter);
            rowRequest.query(
              $scope.ejs.ConstantScoreQuery().query(
                $scope.ejs.TermQuery($scope.panel.persistent_field, s.id)
              )
            );
            rowRequest.size(1).fields(_.unique(
              [ stripRaw($scope.panel.display_field), stripRaw($scope.panel.persistent_field)]
            ));

            rowRequest.sort("@timestamp", "desc");

            mrequest.requests(rowRequest);
          });

          mrequest.doSearch(function (r) {

            esVersion.is('>=1.0.0.RC1').then(function (version) {
              var
                hit,
                display_name,
                persistent_name;

              _.each(r.responses, function (response) {
                if (response.hits.hits.length === 0) {
                  return;
                }

                hit = response.hits.hits[0];
                if (version) {
                  display_name = (hit.fields[stripRaw($scope.panel.display_field)] || [ undefined ])[0];
                  persistent_name = (hit.fields[stripRaw($scope.panel.persistent_field)] || [ undefined] )[0];
                }
                else {
                  display_name = hit.fields[stripRaw($scope.panel.display_field)];
                  persistent_name = hit.fields[stripRaw($scope.panel.persistent_field)];
                }
                (newData[persistent_name] || {}).display_name = display_name;
              });
              $scope._register_data_end();
              $scope.select_display_data_and_enrich(newData);
            });
          }, $scope._register_data_end);
        }, $scope._register_data_end);

      };

      function applyNewData(rows, data) {
        $scope.meta = {
          masterCount: _.filter(data, {master: true, alive: true}).length
        };

        $scope.rows = rows;
        $scope.data = data;
        $scope.updateUIFeaturesBasedOnData();
        $scope.panelMeta.loading = false;
        $scope.calculateWarnings();
      }

      $scope.select_display_data_and_enrich = function (newData) {
        // Make sure we have everything for the request to complete

        if (_.isUndefined(newData)) {
          newData = $scope.data;
        }

        if (dashboard.indices.length === 0 || _.isEmpty(newData)) {
          applyNewData([], {});
          return;
        }

        $scope.panelMeta.loading = true;
        var
          request,
          results,
          newRows, newRowsIds;

        // decide what rows we're showing...
        newRowsIds = [];
        if ($scope.panel.rowFilter) {
          var lcFilter = $scope.panel.rowFilter.toLowerCase();
          _.each(newData, function (s) {
            var data = s.id.toLowerCase();
            if (data.indexOf(lcFilter) >= 0) {
              newRowsIds.push(s.id);
              return;
            }
            data = s.display_name.toLowerCase();
            if (data.indexOf(lcFilter) >= 0) {
              newRowsIds.push(s.id);
            }
          });
        }
        else {
          _.each(newData, function (s) {
              newRowsIds.push(s.id);
            }
          );
        }


        function compareIdBySelection(id1, id2) {
          var s1 = newData[id1], s2 = newData[id2];
          if (s1.selected && !s2.selected) {
            return -1;
          }
          if (!s1.selected && s2.selected) {
            return 1;
          }
          return 0;
        }

        function compareIdByAlert(id1, id2) {
          var s1 = newData[id1], s2 = newData[id2];
          if (s1.alert_level > s2.alert_level) {
            return -1;
          }
          if (s1.alert_level < s2.alert_level) {
            return 1;
          }
          return 0;
        }

        function compareIdByStaleness(id1, id2) {
          var s1 = newData[id1], s2 = newData[id2];
          if (!s1.alive && s2.alive) {
            return -1;
          }
          if (s1.alive && !s2.alive) {
            return 1;
          }
          return 0;
        }

        function compareIdByName(id1, id2) {
          var s1 = newData[id1], s2 = newData[id2];
          if (s1.display_name < s2.display_name) {
            return -1;
          }
          if (s1.display_name > s2.display_name) {
            return 1;
          }
          return 0;
        }

        function compareIdByMasterRole(id1, id2) {
          var s1 = newData[id1], s2 = newData[id2];
          if (s1.master && !s2.master) {
            return -1;
          }
          if (!s1.master && s2.master) {
            return 1;
          }
          return 0;
        }

        function compareIdByPanelSort(id1, id2) {
          var v1 = $scope.get_sort_value(id1, newData),
            v2 = $scope.get_sort_value(id2, newData),
            r = 0;
          if (v1 < v2) {
            r = -1;
          }
          else if (v1 > v2) {
            r = 1;
          }

          if ($scope.panel.sort[1] === "desc") {
            r *= -1;
          }
          return r;
        }

        function concatSorting() {
          var funcs = arguments;
          return function (d1, d2) {
            for (var i = 0; i < funcs.length; i++) {
              var r = funcs[i].call(this, d1, d2);
              if (r !== 0) {
                return r;
              }
            }
            return 0;
          };
        }

        if ($scope.panel.sort) {
          newRowsIds.sort(concatSorting(compareIdByPanelSort, compareIdByAlert, compareIdByStaleness,
            compareIdBySelection, compareIdByMasterRole));
          newRowsIds = newRowsIds.slice(0, $scope.rowLimit);

        }
        else {
          newRowsIds.sort(concatSorting(compareIdBySelection, compareIdByAlert, compareIdByStaleness,
            compareIdByMasterRole, compareIdByName));
          newRowsIds = newRowsIds.slice(0, $scope.rowLimit);
          // sort again for visual effect
          // sort again for visual placement
          newRowsIds.sort(concatSorting(compareIdByAlert, compareIdByName));
        }


        newRows = _.map(newRowsIds, function (id) {
          return newData[id];
        });


        request = $scope.ejs.Request().indices(dashboard.indices);
        var to = filterSrv.timeRange(false).to;
        if (to !== "now") {
          to = kbn.parseDate(to).valueOf() + "||";
        }
        var filter = $scope.ejs.BoolFilter()
          .must($scope.ejs.RangeFilter('@timestamp').from(to + "-10m/m").to(to + "/m"))
          .must($scope.get_mode_filter());
        request.query($scope.ejs.FilteredQuery($scope.ejs.MatchAllQuery(), filter)).size(0);

        _.each(newRows, function (row) {
          _.each($scope.panel.metrics, function (m) {
            if (!row[m.field] || row[m.field].series) {
              // already have it or the field was not present in the first iteration. Ignore for now.
              return;
            }
            request.facet($scope.ejs.DateHistogramFacet($scope.get_history_key(row.id, m))
              .keyField('@timestamp').valueField(m.field).interval('1m')
              .facetFilter($scope.ejs.TermFilter($scope.panel.persistent_field, row.id))
            );

          });
        });

        if (!request.facet() || request.facet().length === 0) {
          applyNewData(newRows, newData);
          return;
        }

        results = request.doSearch();

        // Populate scope when we have results
        results.then(function (results) {
            addHistoryFacetResults(results.facets, newRows, newData, $scope.panel.metrics);

            // sort again for visual correctness & because history facets may change current values.
            var sf;
            if ($scope.panel.sort) {
              sf = concatSorting(compareIdByPanelSort, compareIdByAlert, compareIdByStaleness,
                compareIdBySelection, compareIdByMasterRole);
            }
            else {
              sf = concatSorting(compareIdByAlert, compareIdByName);
            }
            newRows.sort(function (r1, r2) {
              return sf(r1.id, r2.id);
            });
            applyNewData(newRows, newData);
          }
        );
      };

      var addHistoryFacetResults = function (facets, rows, data, metrics) {
        _.each(metrics, function (m) {
          _.each(rows, function (row) {
            var history_key = $scope.get_history_key(row.id, m);
            var history_facet = facets[history_key];
            if (!history_facet) {
              // no data for this chart.
              return;
            }
            var series_data = _.pluck(history_facet.entries, m.derivative ? 'min' : 'mean');
            var series_time = _.pluck(history_facet.entries, 'time');
            var summary = row[m.field];

            if (m.scale && m.scale !== 1) {
              series_data = _.map(series_data, function (v) {
                return v / m.scale;
              });
            }

            if (m.derivative) {

              // update mean to match min & max. Mean is calculated using the entire period's min/max
              // this can be different than the calculation here that is based of the min of every small bucket


              series_data = _.map(series_data, function (p, i) {

                var _v;
                if (i === 0) {
                  _v = null;
                }
                else {
                  var _t = ((series_time[i] - series_time[i - 1]) / 1000); // milliseconds -> seconds.
                  _v = (p - series_data[i - 1]) / _t;
                }
                return _v >= 0 ? _v : null; // we only derive increasing counters. Negative numbers mean reset.
              });

              summary.max = _.reduce(series_data, function (m, v) {
                return m < v && v != null ? v : m;
              }, Number.NEGATIVE_INFINITY);
              summary.min = _.reduce(series_data, function (m, v) {
                return m > v && v != null ? v : m;
              }, Number.POSITIVE_INFINITY);
              if (summary.max === Number.NEGATIVE_INFINITY) {
                summary.max = null;
              }
              if (summary.min === Number.POSITIVE_INFINITY) {
                summary.min = null;
              }

            }

            summary.series = _.zip(series_time, series_data);
            summary.value = series_data[series_data.length - 1]; // use the last data point as value
            summary.alert_level = $scope.alertLevel(m, summary.value);
            if (summary.alert_level > row.alert_level) {
              row.alert_level = summary.alert_level;
            }
          });
        });

        return facets;
      };

      $scope.hasSelected = function (rows) {
        return _.some(rows || $scope.data, function (n) {
          return n.selected;
        });
      };

      $scope.selectedData = function (data) {
        return _.filter(data || $scope.data, function (d) {
          return d.selected;
        });
      };

      $scope.get_sort_value = function (id, data) {
        if (!data) {
          data = $scope.data;
        }
        id = data[id];
        if ($scope.panel.sort[0] === '__name__') {
          return id.display_name;
        }
        return id[$scope.panel.sort[0]].value;
      };

      $scope.set_sort = function (field) {
        if ($scope.panel.sort && $scope.panel.sort[0] === field) {
          if ($scope.panel.sort[1] === "asc") {
            $scope.panel.sort[1] = "desc";
          }
          else if ($scope.panel.sort[1] === "desc") {
            $scope.panel.sort = null;
          }
          else {
            // shouldn't happen, but whatever
            $scope.panel.sort[1] = "asc";
          }
        }
        else {
          $scope.panel.sort = [field, 'asc'];
        }
        $scope.select_display_data_and_enrich();
      };

      $scope.showFullTable = function () {
        if ($scope.panel.compact) {
          return false;
        }
        else {
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
        // If a is empty then return an empty string
        if (!a) {
          return ''; 
        }

        // Get the value for the metric
        var value = y_format_metric_value(a.threshold, metric);
        
        // Return the value with the upper or lower bound
        return (a.type === "upper_bound" ? ">" : "<") + value;
      };

      $scope.detailViewLink = function (rows, fields) {
        var
          query,
          time,
          show,
          from,
          to;

        if (_.isUndefined(rows)) {
          rows = $scope.selectedData();
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
        }
        else {
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
        if ($scope.panel.mode === "nodes") {
          return $scope.hasSelected($scope.rows) ?
            'Open node statistics dashboard for selected nodes' :
            'Select nodes and click to open the node statistics dashboard';
        }
        else {
          return $scope.hasSelected($scope.rows) ?
            'Open index stats dashboard for selected indices' :
            'Select indices and click to open the index stats dashboard';
        }

      };

      $scope.calculateWarnings = function () {
        $scope.warnLevels = {};
        _.each($scope.panel.metrics, function (metric) {
          $scope.warnLevels[metric.field] = 0;
          _.each($scope.data, function (s) {
            var level = (s[metric.field] || {}).alert_level;
            if (!_.isUndefined(level) && level > $scope.warnLevels[metric.field]) {
              $scope.warnLevels[metric.field] = level;
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
        }
        else if (testAlert(metric.warning, num)) {
          level = 1;
        }

        if (document.location.search.match(/panic_demo/)) {
          var r = Math.random();
          if (r > 0.9) {
            level = 2;
          }
          else if (r > 0.8) {
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


      $scope.parseAlert = function (s, metric) {
        if (!s) {
          return null;
        }
        var ret = { type: "upper_bound"};
        if (s[0] === '<') {
          ret.type = "lower_bound";
          s = s.substr(1);
        }
        else if (s[0] === '>') {
          s = s.substr(1);
        }

        if (metric.y_format === 'bytes') {
          if (/\d+\s*[KkGgMmTt]?[bB]/.test(s)) {
            s = numeral().unformat(s);
          }
        }

        if (metric.y_format === 'short') {
          if (/\d+\s*[KkBbMmTt]/.test(s)) {
            s = numeral().unformat(s.toUpperCase());
          }
        }

        ret.threshold = parseFloat(s);
        if (isNaN(ret.threshold)) {
          return null;
        }
        return ret;

      };

      $scope.addMetric = function (panel, metric) {
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
          $scope.get_data();
        }
        $scope._needs_refresh = false;
        $scope.$emit('render');
      };

      $scope.deleteMetric = function (panel, index) {
        panel.metrics = _.without(panel.metrics, panel.metrics[index]);
      };

      $scope.onRowFilterChange = _.debounce(function () {
        $scope.$apply(function (scope) {
          $scope.select_display_data_and_enrich(scope.data);
        });
      }, 500);

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
              return scope.parseAlert(viewValue, scope.metric);
            }
            else {
              // it is invalid, return undefined (no model update)
              ctrl.$setValidity('alertValue', false);
              return undefined;
            }
          });
          ctrl.$formatters.unshift(function (modelValue) {
            return scope.formatAlert(modelValue, scope.metric);
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
