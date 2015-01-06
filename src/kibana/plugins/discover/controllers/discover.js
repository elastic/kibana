define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var moment = require('moment');
  var settingsHtml = require('text!plugins/discover/partials/settings.html');
  var saveHtml = require('text!plugins/discover/partials/save_search.html');
  var loadHtml = require('text!plugins/discover/partials/load_search.html');
  var onlyDisabled = require('components/filter_bar/lib/onlyDisabled');
  var filterManager = require('components/filter_manager/filter_manager');

  var interval = require('utils/interval');
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

  require('plugins/discover/directives/table');

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
      indexList: function (courier) {
        return courier.indexPatterns.getIds();
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

    var notify = new Notifier({
      location: 'Discover'
    });

    $scope.timefilter = timefilter;

    // the saved savedSearch
    var savedSearch = $route.current.locals.savedSearch;
    $scope.$on('$destroy', savedSearch.destroy);

    // list of indexPattern id's
    var indexPatternList = $route.current.locals.indexList;

    // the actual courier.SearchSource
    $scope.searchSource = savedSearch.searchSource;

    // Manage state & url state
    var initialQuery = $scope.searchSource.get('query');

    if (savedSearch.id) {
      docTitle.change(savedSearch.title);
    }

    var stateDefaults = {
      query: initialQuery || '',
      sort: savedSearch.sort || [],
      columns: savedSearch.columns || ['_source'],
      index: $scope.searchSource.get('index').id || config.get('defaultIndex'),
      interval: 'auto',
      filters: _.cloneDeep($scope.searchSource.get('filter'))
    };

    var metaFields = config.get('metaFields');

    var $state = $scope.state = new AppState(stateDefaults);
    filterManager.init($state);

    if (!_.contains(indexPatternList, $state.index)) {
      var reason = 'The index specified in the URL is not a configured pattern. ';
      var defaultIndex = config.get('defaultIndex');
      if (defaultIndex) {
        notify.warning(reason + 'Updated it to use the default: "' + defaultIndex + '"');
        $state.index = config.get('defaultIndex');
      } else {
        notify.warning(reason + 'Please set a default index to continue.');
        kbnUrl.redirect('/settings/indices');

        return;
      }
    }

    $scope.opts = {
      // number of records to fetch, then paginate through
      sampleSize: config.get('discover:sampleSize'),
      // Index to match
      index: $state.index,
      savedSearch: savedSearch,
      indexPatternList: indexPatternList,
      changeIndexAndReload: function () {
        $state.index = $scope.opts.index;
        $state.save();
        $route.reload();
      }
    };

    // stores the complete list of fields
    $scope.fields = null;

    var init = _.once(function () {
      var showTotal = 5;
      $scope.failuresShown = showTotal;
      $scope.showAllFailures = function () {
        $scope.failuresShown = $scope.failures.length;
      };
      $scope.showLessFailures = function () {
        $scope.failuresShown = showTotal;
      };
      return $scope.updateDataSource()
      .then(function () {
        setFields();

        // state fields that shouldn't trigger a fetch when changed
        var ignoreStateChanges = ['columns'];

        // listen for changes, and relisten everytime something happens
        $scope.$listen($state, 'fetch_with_changes', updateFields);
        $scope.$listen($state, 'reset_with_changes', updateFields);

        function updateFields(changed) {
          if (_.contains(changed, 'columns')) {
            $scope.fields.forEach(function (field) {
              field.display = _.contains($state.columns, field.name);
            });
            refreshColumns();
          }

          // if we only have ignorable changes, do nothing
          if (_.difference(changed, ignoreStateChanges).length) $scope.fetch();
        }

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

        $scope.$watch('state.filters', function (newFilters, oldFilters) {
          if (onlyDisabled(newFilters, oldFilters)) {
            $state.save();
            return;
          }
          $scope.fetch();
        });

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
          notify.error('An error occured with your request. Reset your inputs and try again.');
        }).catch(notify.fatal);

        if ($scope.opts.timefield) {
          setupVisualization().then(function () {
            $scope.updateTime();
            init.complete = true;
            $scope.$emit('application.load');
          });
        } else {
          init.complete = true;
          $scope.$emit('application.load');
        }

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
          if (id) {
            notify.info('Saved Data Source "' + savedSearch.title + '"');
            if (savedSearch.id !== $route.current.params.id) {
              kbnUrl.change('/discover/{{id}}', { id: savedSearch.id });
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

      if (_.isEmpty($state.columns)) {
        refreshColumns();
      }

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
      var timeField = $scope.searchSource.get('index').timeFieldName;
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

        $scope.hits += resp.hits.total;
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
          var indexPattern = $scope.searchSource.get('index');
          hit.$$_flattened = indexPattern.flattenHit(hit);

          var formatAndCount = function (value, name) {
            // add up the counts for each field name
            counts[name] = counts[name] ? counts[name] + 1 : 1;

            var defaultFormat = courier.indexPatterns.fieldFormats.defaultByType.string;
            var field = indexPattern.fields.byName[name];
            var formatter = (field && field.format) ? field.format : defaultFormat;

            return formatter.convert(value);
          };

          hit.$$_formatted = _.mapValues(hit.$$_flattened, formatAndCount);
        });

        // apply the field counts to the field list
        // We could do this in the field_chooser but it would us to iterate the array again
        $scope.fields.forEach(function (field) {
          field.rowCount = counts[field.name] || 0;
        });
      }));

      segmented.on('mergedSegment', function (merged) {
        $scope.mergedEsResp = merged;
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

    $scope.toggleConfig = function () {
      // Close if already open
      if ($scope.configTemplate === settingsHtml) {
        delete $scope.configTemplate;
      } else {
        $scope.configTemplate = settingsHtml;
      }
    };

    $scope.toggleSave = function () {
      // Close if already open
      if ($scope.configTemplate === saveHtml) {
        delete $scope.configTemplate;
      } else {
        $scope.configTemplate = saveHtml;
      }
    };

    $scope.toggleLoad = function () {
      // Close if already open
      if ($scope.configTemplate === loadHtml) {
        delete $scope.configTemplate;
      } else {
        $scope.configTemplate = loadHtml;
      }
    };

    $scope.resetQuery = function () {
      $state.reset();
      $scope.fetch();
    };

    $scope.newQuery = function () {
      kbnUrl.change('/discover');
    };

    $scope.updateDataSource = function () {
      var chartOptions;
      $scope.searchSource
      .size($scope.opts.sampleSize)
      .sort(function () {
        var sort = {};
        if (_.isArray($state.sort) && $state.sort.length === 2) {
          sort[$state.sort[0]] = $state.sort[1];
        } else if ($scope.indexPattern.timeFieldName) {
          // Use the watcher to set sort in this case, the above `if` will now be true
          $state.sort = [$scope.indexPattern.timeFieldName, 'desc'];
        } else {
          sort._score = 'desc';
        }
        return sort;
      })
      .query(!$state.query ? null : $state.query)
      .highlight({
        pre_tags: [highlightTags.pre],
        post_tags: [highlightTags.post],
        fields: {'*': {}}
      })
      .set('filter', $state.filters || []);

      $state.index = $scope.opts.index = $scope.opts.index || config.get('defaultIndex');
      return courier.indexPatterns.get($scope.opts.index).then(function (pattern) {
        $scope.indexPattern = pattern;
        $scope.opts.timefield = $scope.indexPattern.timeFieldName;

        // did we update the index pattern?
        var refresh = $scope.indexPattern !== $scope.searchSource.get('index');

        // make sure the pattern is set on the "leaf" searchSource, not just the root
        $scope.searchSource.set('index', pattern);

        if (refresh) {
          delete $state.sort;
          delete $scope.fields;
          delete $scope.columns;
          setFields();
        }
      });

    };

    // This is a hacky optimization for comparing the contents of a large array to a short one.
    function arrayToKeys(array, value) {
      var obj = {};
      _.each(array, function (key) {
        obj[key] = value || true;
      });
      return obj;
    }

    function setFields() {
      var indexPattern = $scope.searchSource.get('index');
      var currentState = _.transform($scope.fields || [], function (current, field) {
        current[field.name] = {
          display: field.display
        };
      }, {});

      var columnObjects = arrayToKeys($state.columns);

      $scope.fields = [];
      $scope.fieldsByName = {};

      if (!indexPattern) return;

      _.sortBy(indexPattern.fields, 'name').forEach(function (field) {
        _.defaults(field, currentState[field.name]);

        // clone the field with Object.create so that it's getters
        // and non-enumerable props are preserved
        var clone = Object.create(field);
        clone.display = columnObjects[field.name] || false;
        clone.rowCount = $scope.rows ? $scope.rows.fieldCounts[field.name] : 0;

        $scope.fields.push(clone);
        $scope.fieldsByName[field.name] = clone;
      });

      refreshColumns();
    }

    // TODO: On array fields, negating does not negate the combination, rather all terms
    $scope.filterQuery = function (field, values, operation) {
      var indexPattern = $scope.searchSource.get('index');
      indexPattern.popularizeField(field, 1);
      filterManager.add(field, values, operation, $state.index);
    };

    $scope.toggleField = function (name) {
      var field = _.find($scope.fields, { name: name });

      // If we can't find the field in the mapping, ensure it isn't in the column list and abort
      if (!field) {
        $state.columns = _.without($state.columns, name);
        return;
      }

      // toggle the display property
      field.display = !field.display;

      if ($state.columns.length === 1 && $state.columns[0] === '_source') {
        $state.columns = _.toggleInOut($state.columns, name);
        $state.columns = _.toggleInOut($state.columns, '_source');
        _.find($scope.fields, {name: '_source'}).display = false;
      } else {
        $state.columns = _.toggleInOut($state.columns, name);
      }

      refreshColumns();
    };

    $scope.toTop = function () {
      $window.scrollTo(0, 0);
    };

    function refreshColumns() {
      // Get all displayed field names;
      var fields = _.pluck(_.filter($scope.fields, function (field) {
        return field.display;
      }), 'name');

      // Make sure there are no columns added that aren't in the displayed field list.
      $state.columns = _.intersection($state.columns, fields);


      // If no columns remain, use _source
      if (!$state.columns.length) {
        $scope.toggleField('_source');
        return;
      }

      // if this commit results in something besides the columns changing, a fetch will be executed.
      $state.save();
    }

    // TODO: Move to utility class
    var addSlashes = function (str) {
      if (!_.isString(str)) return str;
      str = str.replace(/\\/g, '\\\\');
      str = str.replace(/\'/g, '\\\'');
      str = str.replace(/\"/g, '\\"');
      str = str.replace(/\0/g, '\\0');
      return str;
    };

    // TODO: Move to utility class
    // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    var regexEscape = function (str) {
      return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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
      $scope.vis = new Vis($scope.searchSource.get('index'), {
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

    init();
  });
});
