define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var moment = require('moment');
  var ConfigTemplate = require('utils/config_template');
  var filterManager = require('components/filter_manager/filter_manager');
  var getSort = require('components/doc_table/lib/get_sort');
  var rison = require('utils/rison');

  var datemath = require('utils/datemath');

  require('components/notify/notify');
  require('components/timepicker/timepicker');
  require('directives/fixed_scroll');
  require('directives/validate_json');
  require('components/validate_query/validate_query');
  require('filters/moment');
  require('components/courier/courier');
  require('components/index_patterns/index_patterns');
  require('components/state_management/app_state');
  require('services/timefilter');
  require('components/highlight/highlight_tags');

  var app = require('modules').get('apps/discover', [
    'kibana/notify',
    'kibana/courier',
    'kibana/index_patterns'
  ]);

  require('routes')
  .when('/discover/:id?', {
    template: require('text!plugins/discover/index.html'),
    reloadOnSearch: false,
    resolve: {
      ip: function (Promise, courier, config, $location) {
        return courier.indexPatterns.getIds()
        .then(function (list) {
          var stateRison = $location.search()._a;
          var state;
          try { state = rison.decode(stateRison); } catch (e) {}
          state = state || {};

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

    var Vis = Private(require('components/vis/vis'));
    var docTitle = Private(require('components/doc_title/doc_title'));
    var brushEvent = Private(require('utils/brush_event'));
    var HitSortFn = Private(require('plugins/discover/_hit_sort_fn'));
    var filterBarWatchFilters = Private(require('components/filter_bar/lib/watchFilters'));

    var notify = new Notifier({
      location: 'Discover'
    });

    // config panel templates
    $scope.configTemplate = new ConfigTemplate({
      load: require('text!plugins/discover/partials/load_search.html'),
      save: require('text!plugins/discover/partials/save_search.html')
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
    function getStateDefaults() {
      return {
        query: $scope.searchSource.get('query') || '',
        sort: getSort.array(savedSearch.sort, $scope.indexPattern),
        columns: savedSearch.columns || ['_source'],
        index: $scope.indexPattern.id,
        interval: 'auto',
        filters: _.cloneDeep($scope.searchSource.get('filter'))
      };
    }

    $state.index = $scope.indexPattern.id;
    $state.sort = getSort.array($state.sort, $scope.indexPattern);

    $scope.$watchCollection('state.columns', function (columns) {
      $state.save();
    });

    var metaFields = config.get('metaFields');
    filterManager.init($state);

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
        $scope.$listen(timefilter, 'update', function () {
          $scope.fetch();
        });

        $scope.$watchCollection('state.sort', function (sort) {
          if (!sort) return;

          // get the current sort from {key: val} to ["key", "val"];
          var currentSort = _.pairs($scope.searchSource.get('sort')).pop();

          // if the searchSource doesn't know, tell it so
          if (!angular.equals(sort, currentSort)) $scope.fetch();
        });

        filterBarWatchFilters($scope)
        .on('update', function () {
          return $scope.updateDataSource().then(function () {
            $state.save();
          });
        })
        .on('fetch', $scope.fetch);

        $scope.$watch('opts.timefield', function (timefield) {
          timefilter.enabled = !!timefield;
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

          function pick(rows, oldRows, fetchStatus, oldFetchStatus) {
            // initial state, pretend we are loading
            if (rows == null && oldRows == null) return status.LOADING;

            var rowsEmpty = _.isEmpty(rows);
            if (rowsEmpty && fetchStatus) return status.LOADING;
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
          console.log(err);
          notify.error('An error occurred with your request. Reset your inputs and try again.');
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
        $scope.rows.fieldCounts = {};
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
        else if (sort[0] === timeField) return 'time';
        else return 'non-time';
      }());

      var sortFn = null;
      if (sortBy === 'non-time') {
        sortFn = new HitSortFn(sort[1]);
      }

      $scope.updateTime();

      segmented.setDirection(sortBy === 'time' ? (sort[1] || 'desc') : 'desc');

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

        var rows = $scope.rows;
        var counts = rows.fieldCounts;

        // merge the rows and the hits, use a new array to help watchers
        rows = $scope.rows = rows.concat(resp.hits.hits);
        rows.fieldCounts = counts;

        if (sortFn) {
          rows.sort(sortFn);
          rows = $scope.rows = rows.slice(0, totalSize);
          counts = rows.fieldCounts = {};
        }

        $scope.rows.forEach(function (hit) {
          // skip this work if we have already done it and we are NOT sorting.
          // ---
          // when we are sorting results, we need to redo the counts each time because the
          // "top 500" may change with each response
          if (hit.$$_formatted && !sortFn) return;

          // Flatten the fields
          hit.$$_flattened = $scope.indexPattern.flattenHit(hit);

          var formatAndCount = function (value, name) {
            // add up the counts for each field name
            counts[name] = counts[name] ? counts[name] + 1 : 1;

            var defaultFormat = courier.indexPatterns.fieldFormats.defaultByType.string;
            var field = $scope.indexPattern.fields.byName[name];
            var formatter = (field && field.format) ? field.format : defaultFormat;

            return formatter.convert(value);
          };

          hit.$$_formatted = _.mapValues(hit.$$_flattened, formatAndCount);
        });

      }));

      segmented.on('mergedSegment', function (merged) {
        $scope.mergedEsResp = merged;
        $scope.hits = merged.hits.total;

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
        from: datemath.parse(timefilter.time.from),
        to: datemath.parse(timefilter.time.to, true)
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
      .highlight({
        pre_tags: [highlightTags.pre],
        post_tags: [highlightTags.post],
        fields: {'*': {}}
      })
      .set('filter', $state.filters || []);
    });

    // TODO: On array fields, negating does not negate the combination, rather all terms
    $scope.filterQuery = function (field, values, operation) {
      $scope.indexPattern.popularizeField(field, 1);
      filterManager.add(field, values, operation, $state.index);
    };

    $scope.toTop = function () {
      $window.scrollTo(0, 0);
    };

    // TODO: Move to utility class
    var addSlashes = function (str) {
      if (!_.isString(str)) return str;
      str = str.replace(/\\/g, '\\\\');
      str = str.replace(/\'/g, '\\\'');
      str = str.replace(/\"/g, '\\"');
      str = str.replace(/\0/g, '\\0');
      return str;
    };

    var loadingVis;
    var setupVisualization = function () {
      // If we're not setting anything up we need to return an empty promise
      if (!$scope.opts.timefield) return Promise.resolve();
      if (loadingVis) return loadingVis;


      // we shouldn't have a vis, delete it
      if (!$scope.opts.timefield && $scope.vis) {
        $scope.vis.destroy();
        $scope.searchSource.set('aggs', undefined);
        delete $scope.vis;
      }

      // we shouldn't have one, or already do, return whatever we already have
      if (!$scope.opts.timefield || $scope.vis) return Promise.resolve($scope.vis);

      // TODO: a legit way to update the index pattern
      $scope.vis = new Vis($scope.indexPattern, {
        type: 'histogram',
        params: {
          addLegend: false,
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
        aggs: [
          {
            type: 'count',
            schema: 'metric'
          },
          {
            type: 'date_histogram',
            schema: 'segment',
            params: {
              field: $scope.opts.timefield,
              interval: 'auto',
              min_doc_count: 0
            }
          }
        ]
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
    };

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
