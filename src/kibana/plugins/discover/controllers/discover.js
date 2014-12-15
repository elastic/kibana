define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var moment = require('moment');
  var settingsHtml = require('text!plugins/discover/partials/settings.html');
  var saveHtml = require('text!plugins/discover/partials/save_search.html');
  var loadHtml = require('text!plugins/discover/partials/load_search.html');

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
    var SegmentedFetch = Private(require('plugins/discover/_segmented_fetch'));
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
    var segmentedFetch = $scope.segmentedFetch = new SegmentedFetch($scope.searchSource);

    // abort any seqmented query requests when leaving discover
    $scope.$on('$routeChangeStart', function () {
      segmentedFetch.abort();
    });

    // Manage state & url state
    var initialQuery = $scope.searchSource.get('query');

    if (savedSearch.id) {
      docTitle.change(savedSearch.title);
    }

    var stateDefaults = {
      query: initialQuery || '',
      columns: savedSearch.columns || ['_source'],
      index: $scope.searchSource.get('index').id || config.get('defaultIndex'),
      interval: 'auto',
      filters: _.cloneDeep($scope.searchSource.get('filter'))
    };

    var metaFields = config.get('metaFields');

    var $state = $scope.state = new AppState(stateDefaults);

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

        $scope.$watch('state.sort', function (sort) {
          if (!sort) return;

          // get the current sort from {key: val} to ["key", "val"];
          var currentSort = _.pairs($scope.searchSource.get('sort')).pop();

          // if the searchSource doesn't know, tell it so
          if (!angular.equals(sort, currentSort)) $scope.fetch();
        });

        $scope.$watch('state.filters', function (filters) {
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

        return savedSearch.save()
        .then(function () {
          notify.info('Saved Data Source "' + savedSearch.title + '"');
          if (savedSearch.id !== $route.current.params.id) {
            kbnUrl.change('/discover/{{id}}', { id: savedSearch.id });
          }
        });
      })
      .catch(notify.error);
    };

    $scope.opts.fetch = $scope.fetch = function () {
      // flag used to set the scope based on data from segmentedFetch
      var resetRows = true;

      function flushResponseData() {
        $scope.hits = 0;
        $scope.faliures = [];
        $scope.rows = [];
        $scope.rows.fieldCounts = {};
      }

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

        return segmentedFetch.fetch({
          totalSize: sortBy === 'non-time' ? false : totalSize,
          direction: sortBy === 'time' ? sort[1] : 'desc',
          status: function (status) {
            $scope.fetchStatus = status;
          },
          first: function (resp) {
            if (!$scope.rows) {
              flushResponseData();
            }
          },
          each: notify.timed('handle each segment', function (resp, req) {
            if (resetRows) {
              if (!resp.hits.total) return;
              resetRows = false;
              flushResponseData();
            }

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
          }),
          eachMerged: function (merged) {
            if (!resetRows) {
              $scope.mergedEsResp = merged;
            }
          }
        })
        .finally(function () {
          if (resetRows) {
            flushResponseData();
          }
          $scope.fetchStatus = false;
        });
      })
      .catch(notify.error);
    };

    // we use a custom fetch mechanism, so tie into the courier's looper
    courier.searchLooper.add($scope.fetch);
    $scope.$on('$destroy', function () {
      courier.searchLooper.remove($scope.fetch);
    });

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
        if (_.isArray($state.sort)) {
          sort[$state.sort[0]] = $state.sort[1];
        } else if (indexPattern.timeFieldName) {
          sort[indexPattern.timeFieldName] = 'desc';
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

      // get the current indexPattern
      var indexPattern = $scope.indexPattern = $scope.searchSource.get('index');

      // if indexPattern exists, but $scope.opts.index doesn't, or the opposite, or if indexPattern's id
      // is not equal to the $scope.opts.index then either clean or
      if (
        Boolean($scope.opts.index) !== Boolean(indexPattern)
        || (indexPattern && indexPattern.id) !== $scope.opts.index
      ) {
        $state.index = $scope.opts.index = $scope.opts.index || config.get('defaultIndex');
        indexPattern = courier.indexPatterns.get($scope.opts.index);
      }

      $scope.opts.timefield = indexPattern.timeFieldName;

      return Promise.cast(indexPattern)
      .then(function (indexPattern) {
        $scope.opts.timefield = indexPattern.timeFieldName;

        // did we update the index pattern?
        var refresh = indexPattern !== $scope.searchSource.get('index');

        // make sure the pattern is set on the "leaf" searchSource, not just the root
        $scope.searchSource.set('index', indexPattern);

        if (refresh) {
          $scope.indexPattern = indexPattern;
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
      values = _.isArray(values) ? values : [values];

      var indexPattern = $scope.searchSource.get('index');
      indexPattern.popularizeField(field, 1);
      var negate = operation === '-';

      // Grap the filters from the searchSource and ensure it's an array
      var filters = _.flatten([$state.filters], true);

      _.each(values, function (value) {
        var existing = _.find(filters, function (filter) {
          if (!filter) return;

          if (field === '_exists_' && filter.exists) {
            return filter.exists.field === value;
          }

          if (field === '_missing_' && filter.missing) {
            return filter.missing.field === value;
          }

          if (filter.query) {
            return filter.query.match[field] && filter.query.match[field].query === value;
          }
        });

        if (existing) {
          if (existing.meta.negate !== negate) existing.meta.negate = negate;
          return;
        }

        switch (field) {
        case '_exists_':
          filters.push({
            exists: {
              field: value
            }
          });
          break;
        case '_missing_':
          filters.push({
            missing: {
              field: value
            }
          });
          break;
        default:
          var filter = { meta: { negate: negate, index: $state.index }, query: { match: {} } };
          filter.query.match[field] = { query: value, type: 'phrase' };
          filters.push(filter);
          break;
        }
      });

      $state.filters = filters;
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
        vislibParams: {
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
