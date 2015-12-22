define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var moment = require('moment');
  var ConfigTemplate = require('ui/ConfigTemplate');
  var getSort = require('ui/doc_table/lib/get_sort');
  var rison = require('ui/utils/rison');

  var dateMath = require('ui/utils/dateMath');

  require('ui/doc_table');
  require('ui/visualize');
  require('ui/notify');
  require('ui/fixedScroll');
  require('ui/directives/validate_json');
  require('ui/filters/moment');
  require('ui/courier');
  require('ui/index_patterns');
  require('ui/state_management/app_state');
  require('ui/timefilter');
  require('ui/highlight/highlight_tags');
  require('ui/share');

  var app = require('ui/modules').get('apps/discover', [
    'kibana/notify',
    'kibana/courier',
    'kibana/index_patterns'
  ]);

  require('ui/routes')
  .when('/discover/:id?', {
    template: require('plugins/kibana/discover/index.html'),
    reloadOnSearch: false,
    resolve: {
      ip: function (Promise, courier, config, $location) {
        return courier.indexPatterns.getIds()
        .then(function (list) {
          var stateRison = $location.search()._a;

          var state;
          try { state = rison.decode(stateRison); }
          catch (e) { state = {}; }

          var specified = !!state.index;
          var exists = _.contains(list, state.index);
          var id = exists ? state.index : config.get('defaultIndex');

          return Promise.props({
            list: list,
            loaded: courier.indexPatterns.get(id),
            stateVal: state.index,
            stateValFound: specified && exists
          });
        });
      },
      savedSearch: function (courier, savedSearches, $route) {
        return savedSearches.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'search': '/discover',
          'index-pattern': '/settings/objects/savedSearches/' + $route.current.params.id
        }));
      }
    }
  });

  app.controller('discover', function ($scope, config, courier, $route, $window, Notifier,
    AppState, timefilter, Promise, Private, kbnUrl, highlightTags) {

    var Vis = Private(require('ui/Vis'));
    var docTitle = Private(require('ui/doc_title'));
    var brushEvent = Private(require('ui/utils/brush_event'));
    var HitSortFn = Private(require('plugins/kibana/discover/_hit_sort_fn'));
    var queryFilter = Private(require('ui/filter_bar/query_filter'));
    var filterManager = Private(require('ui/filter_manager'));

    var notify = new Notifier({
      location: 'Discover'
    });

    $scope.intervalOptions = Private(require('ui/agg_types/buckets/_interval_options'));
    $scope.showInterval = false;

    $scope.intervalEnabled = function (interval) {
      return interval.val !== 'custom';
    };

    $scope.toggleInterval = function () {
      $scope.showInterval = !$scope.showInterval;
    };

    // config panel templates
    $scope.configTemplate = new ConfigTemplate({
      load: require('plugins/kibana/discover/partials/load_search.html'),
      save: require('plugins/kibana/discover/partials/save_search.html'),
      share: require('plugins/kibana/discover/partials/share_search.html')
    });

    $scope.timefilter = timefilter;

    // the saved savedSearch
    var savedSearch = $route.current.locals.savedSearch;
    $scope.$on('$destroy', savedSearch.destroy);

    // the actual courier.SearchSource
    $scope.searchSource = savedSearch.searchSource;
    $scope.indexPattern = resolveIndexPatternLoading();
    $scope.searchSource.set('index', $scope.indexPattern);

    if (savedSearch.id) {
      docTitle.change(savedSearch.title);
    }

    var $state = $scope.state = new AppState(getStateDefaults());
    $scope.uiState = $state.makeStateful('uiState');

    function getStateDefaults() {
      return {
        query: $scope.searchSource.get('query') || '',
        sort: getSort.array(savedSearch.sort, $scope.indexPattern),
        columns: savedSearch.columns || ['_source'],
        index: $scope.indexPattern.id,
        interval: 'auto',
        filters: _.cloneDeep($scope.searchSource.getOwn('filter'))
      };
    }

    $state.index = $scope.indexPattern.id;
    $state.sort = getSort.array($state.sort, $scope.indexPattern);

    $scope.$watchCollection('state.columns', function () {
      $state.save();
    });

    $scope.opts = {
      // number of records to fetch, then paginate through
      sampleSize: config.get('discover:sampleSize'),
      // Index to match
      index: $scope.indexPattern.id,
      timefield: $scope.indexPattern.timeFieldName,
      savedSearch: savedSearch,
      indexPatternList: $route.current.locals.ip.list
    };

    var init = _.once(function () {
      var showTotal = 5;
      $scope.failuresShown = showTotal;
      $scope.showAllFailures = function () {
        $scope.failuresShown = $scope.failures.length;
      };
      $scope.showLessFailures = function () {
        $scope.failuresShown = showTotal;
      };

      $scope.updateDataSource()
      .then(function () {
        $scope.$listen(timefilter, 'fetch', function () {
          $scope.fetch();
        });

        $scope.$watchCollection('state.sort', function (sort) {
          if (!sort) return;

          // get the current sort from {key: val} to ["key", "val"];
          var currentSort = _.pairs($scope.searchSource.get('sort')).pop();

          // if the searchSource doesn't know, tell it so
          if (!angular.equals(sort, currentSort)) $scope.fetch();
        });

        // update data source when filters update
        $scope.$listen(queryFilter, 'update', function () {
          return $scope.updateDataSource().then(function () {
            $state.save();
          });
        });

        // update data source when hitting forward/back and the query changes
        $scope.$listen($state, 'fetch_with_changes', function (diff) {
          if (diff.indexOf('query') >= 0) $scope.fetch();
        });

        // fetch data when filters fire fetch event
        $scope.$listen(queryFilter, 'fetch', $scope.fetch);

        $scope.$watch('opts.timefield', function (timefield) {
          timefilter.enabled = !!timefield;
        });

        $scope.$watch('state.interval', function (interval, oldInterval) {
          if (interval !== oldInterval && interval === 'auto') {
            $scope.showInterval = false;
          }
          $scope.fetch();
        });

        $scope.$watch('vis.aggs', function () {
          // no timefield, no vis, nothing to update
          if (!$scope.opts.timefield) return;

          var buckets = $scope.vis.aggs.bySchemaGroup.buckets;

          if (buckets && buckets.length === 1) {
            $scope.intervalName = 'by ' + buckets[0].buckets.getInterval().description;
          } else {
            $scope.intervalName = 'auto';
          }
        });

        $scope.$watchMulti([
          'rows',
          'fetchStatus'
        ], (function updateResultState() {
          var prev = {};
          var status = {
            LOADING: 'loading', // initial data load
            READY: 'ready', // results came back
            NO_RESULTS: 'none' // no results came back
          };

          function pick(rows, oldRows, fetchStatus) {
            // initial state, pretend we are loading
            if (rows == null && oldRows == null) return status.LOADING;

            var rowsEmpty = _.isEmpty(rows);
            // An undefined fetchStatus means the requests are still being
            // prepared to be sent. When all requests are completed,
            // fetchStatus is set to null, so it's important that we
            // specifically check for undefined to determine a loading status.
            var preparingForFetch = _.isUndefined(fetchStatus);
            if (preparingForFetch) return status.LOADING;
            else if (rowsEmpty && fetchStatus) return status.LOADING;
            else if (!rowsEmpty) return status.READY;
            else return status.NO_RESULTS;
          }

          return function () {
            var current = {
              rows: $scope.rows,
              fetchStatus: $scope.fetchStatus
            };

            $scope.resultState = pick(
              current.rows,
              prev.rows,
              current.fetchStatus,
              prev.fetchStatus
            );

            prev = current;
          };
        }()));

        $scope.searchSource.onError(function (err) {
          notify.error(err);
        }).catch(notify.fatal);

        function initForTime() {
          return setupVisualization().then($scope.updateTime);
        }

        return Promise.resolve($scope.opts.timefield && initForTime())
        .then(function () {
          init.complete = true;
          $state.replace();
          $scope.$emit('application.load');
        });
      });
    });

    $scope.opts.saveDataSource = function () {
      return $scope.updateDataSource()
      .then(function () {
        savedSearch.id = savedSearch.title;
        savedSearch.columns = $scope.state.columns;
        savedSearch.sort = $scope.state.sort;

        return savedSearch.save()
        .then(function (id) {
          $scope.configTemplate.close('save');

          if (id) {
            notify.info('Saved Data Source "' + savedSearch.title + '"');
            if (savedSearch.id !== $route.current.params.id) {
              kbnUrl.change('/discover/{{id}}', { id: savedSearch.id });
            } else {
              // Update defaults so that "reload saved query" functions correctly
              $state.setDefaults(getStateDefaults());
            }
          }
        });
      })
      .catch(notify.error);
    };

    $scope.opts.fetch = $scope.fetch = function () {
      // ignore requests to fetch before the app inits
      if (!init.complete) return;

      $scope.updateTime();

      $scope.updateDataSource()
      .then(setupVisualization)
      .then(function () {
        $state.save();
        return courier.fetch();
      })
      .catch(notify.error);
    };

    $scope.searchSource.onBeginSegmentedFetch(function (segmented) {

      function flushResponseData() {
        $scope.hits = 0;
        $scope.faliures = [];
        $scope.rows = [];
        $scope.fieldCounts = {};
      }

      if (!$scope.rows) flushResponseData();

      var sort = $state.sort;
      var timeField = $scope.indexPattern.timeFieldName;
      var totalSize = $scope.size || $scope.opts.sampleSize;

      /**
       * Basically an emum.
       *
       * opts:
       *   "time" - sorted by the timefield
       *   "non-time" - explicitly sorted by a non-time field, NOT THE SAME AS `sortBy !== "time"`
       *   "implicit" - no sorting set, NOT THE SAME AS "non-time"
       *
       * @type {String}
       */
      var sortBy = (function () {
        if (!_.isArray(sort)) return 'implicit';
        else if (sort[0] === '_score') return 'implicit';
        else if (sort[0] === timeField) return 'time';
        else return 'non-time';
      }());

      var sortFn = null;
      if (sortBy !== 'implicit') {
        sortFn = new HitSortFn(sort[1]);
      }

      $scope.updateTime();
      if (sort[0] === '_score') segmented.setMaxSegments(1);
      segmented.setDirection(sortBy === 'time' ? (sort[1] || 'desc') : 'desc');
      segmented.setSortFn(sortFn);
      segmented.setSize($scope.opts.sampleSize);

      // triggered when the status updated
      segmented.on('status', function (status) {
        $scope.fetchStatus = status;
      });

      segmented.on('first', function () {
        flushResponseData();
      });

      segmented.on('segment', notify.timed('handle each segment', function (resp) {
        if (resp._shards.failed > 0) {
          $scope.failures = _.union($scope.failures, resp._shards.failures);
          $scope.failures = _.uniq($scope.failures, false, function (failure) {
            return failure.index + failure.shard + failure.reason;
          });
        }
      }));

      segmented.on('mergedSegment', function (merged) {
        $scope.mergedEsResp = merged;
        $scope.hits = merged.hits.total;

        var indexPattern = $scope.searchSource.get('index');

        // the merge rows, use a new array to help watchers
        $scope.rows = merged.hits.hits.slice();

        notify.event('flatten hit and count fields', function () {
          var counts = $scope.fieldCounts;

          // if we haven't counted yet, or need a fresh count because we are sorting, reset the counts
          if (!counts || sortFn) counts = $scope.fieldCounts = {};

          $scope.rows.forEach(function (hit) {
            // skip this work if we have already done it
            if (hit.$$_counted) return;

            // when we are sorting results, we need to redo the counts each time because the
            // "top 500" may change with each response, so don't mark this as counted
            if (!sortFn) hit.$$_counted = true;

            var fields = _.keys(indexPattern.flattenHit(hit));
            var n = fields.length;
            var field;
            while (field = fields[--n]) {
              if (counts[field]) counts[field] += 1;
              else counts[field] = 1;
            }
          });
        });
      });

      segmented.on('complete', function () {
        if ($scope.fetchStatus.hitCount === 0) {
          flushResponseData();
        }

        $scope.fetchStatus = null;
      });
    }).catch(notify.fatal);

    $scope.updateTime = function () {
      $scope.timeRange = {
        from: dateMath.parse(timefilter.time.from),
        to: dateMath.parse(timefilter.time.to, true)
      };
    };

    $scope.resetQuery = function () {
      kbnUrl.change('/discover/{{id}}', { id: $route.current.params.id });
    };

    $scope.newQuery = function () {
      kbnUrl.change('/discover');
    };

    $scope.updateDataSource = Promise.method(function () {
      $scope.searchSource
      .size($scope.opts.sampleSize)
      .sort(getSort($state.sort, $scope.indexPattern))
      .query(!$state.query ? null : $state.query)
      .set('filter', queryFilter.getFilters());

      if (config.get('doc_table:highlight')) {
        $scope.searchSource.highlight({
          pre_tags: [highlightTags.pre],
          post_tags: [highlightTags.post],
          fields: {'*': {}},
          require_field_match: false,
          fragment_size: 2147483647 // Limit of an integer.
        });
      }
    });

    // TODO: On array fields, negating does not negate the combination, rather all terms
    $scope.filterQuery = function (field, values, operation) {
      $scope.indexPattern.popularizeField(field, 1);
      filterManager.add(field, values, operation, $state.index);
    };

    $scope.toTop = function () {
      $window.scrollTo(0, 0);
    };

    var loadingVis;
    function setupVisualization() {
      // If we're not setting anything up we need to return an empty promise
      if (!$scope.opts.timefield) return Promise.resolve();
      if (loadingVis) return loadingVis;

      var visStateAggs = [
        {
          type: 'count',
          schema: 'metric'
        },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: {
            field: $scope.opts.timefield,
            interval: $state.interval,
            min_doc_count: 0
          }
        }
      ];

      // we have a vis, just modify the aggs
      if ($scope.vis) {
        var visState = $scope.vis.getState();
        visState.aggs = visStateAggs;

        $scope.vis.setState(visState);
        return Promise.resolve($scope.vis);
      }

      $scope.vis = new Vis($scope.indexPattern, {
        title: savedSearch.title,
        type: 'histogram',
        params: {
          addLegend: false,
          addTimeMarker: true
        },
        listeners: {
          click: function (e) {
            console.log(e);
            timefilter.time.from = moment(e.point.x);
            timefilter.time.to = moment(e.point.x + e.data.ordered.interval);
            timefilter.time.mode = 'absolute';
          },
          brush: brushEvent
        },
        aggs: visStateAggs
      });

      $scope.searchSource.aggs(function () {
        $scope.vis.requesting();
        return $scope.vis.aggs.toDsl();
      });

      // stash this promise so that other calls to setupVisualization will have to wait
      loadingVis = new Promise(function (resolve) {
        $scope.$on('ready:vis', function () {
          resolve($scope.vis);
        });
      })
      .finally(function () {
        // clear the loading flag
        loadingVis = null;
      });

      return loadingVis;
    }

    function resolveIndexPatternLoading() {
      var props = $route.current.locals.ip;
      var loaded = props.loaded;
      var stateVal = props.stateVal;
      var stateValFound = props.stateValFound;

      var own = $scope.searchSource.getOwn('index');

      if (own && !stateVal) return own;
      if (stateVal && !stateValFound) {
        var err = '"' + stateVal + '" is not a configured pattern. ';
        if (own) {
          notify.warning(err + ' Using the saved index pattern: "' + own.id + '"');
          return own;
        }

        notify.warning(err + ' Using the default index pattern: "' + loaded.id + '"');
      }
      return loaded;
    }

    init();
  });
});
