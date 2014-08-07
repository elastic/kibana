define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var moment = require('moment');
  var settingsHtml = require('text!apps/discover/partials/settings.html');
  var saveHtml = require('text!apps/discover/partials/save_search.html');
  var loadHtml = require('text!apps/discover/partials/load_search.html');

  var interval = require('utils/interval');
  var datemath = require('utils/datemath');

  require('components/notify/notify');
  require('components/timepicker/timepicker');
  require('directives/fixed_scroll');
  require('filters/moment');
  require('components/courier/courier');
  require('components/index_patterns/index_patterns');
  require('components/query_input/query_input');
  require('components/state_management/app_state');
  require('services/timefilter');

  require('apps/discover/directives/table');

  require('apps/visualize/saved_visualizations/_adhoc_vis');

  var app = require('modules').get('apps/discover', [
    'kibana/notify',
    'kibana/courier',
    'kibana/index_patterns'
  ]);

  require('routes')
  .when('/discover/:id?', {
    template: require('text!apps/discover/index.html'),
    reloadOnSearch: false,
    resolve: {
      indexList: function (courier) {
        return courier.indexPatterns.getIds();
      },
      savedSearch: function (courier, savedSearches, $route) {
        return savedSearches.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'index-pattern': '/settings/indices',
          '*': '/discover'
        }));
      }
    }
  });


  app.controller('discover', function ($scope, config, courier, $route, $window, savedSearches, savedVisualizations,
    Notifier, $location, globalState, appStateFactory, timefilter, AdhocVis, Promise, Private) {

    var segmentedFetch = $scope.segmentedFetch = Private(require('apps/discover/_segmented_fetch'));
    var HitSortFn = Private(require('apps/discover/_hit_sort_fn'));

    var notify = new Notifier({
      location: 'Discover'
    });

    // the saved savedSearch
    var savedSearch = $route.current.locals.savedSearch;
    $scope.$on('$destroy', savedSearch.destroy);

    // list of indexPattern id's
    var indexPatternList = $route.current.locals.indexList;

    // the actual courier.SearchSource
    $scope.searchSource = savedSearch.searchSource;

    // Manage state & url state
    var initialQuery = $scope.searchSource.get('query');

    var defaultFormat = courier.indexPatterns.fieldFormats.defaultByType.string;

    var stateDefaults = {
      query: initialQuery || '',
      columns: ['_source'],
      index: config.get('defaultIndex'),
      interval: 'auto'
    };

    var metaFields = config.get('metaFields');

    $scope.intervalOptions = [
      'auto',
      'second',
      'minute',
      'hour',
      'day',
      'week',
      'month',
      'year'
    ];

    var $state = $scope.state = new appStateFactory.create(stateDefaults);

    if (!_.contains(indexPatternList, $state.index)) {
      var reason = 'The index specified in the URL is not a configured pattern. ';
      var defaultIndex = config.get('defaultIndex');
      if (defaultIndex) {
        notify.warning(reason + 'Updated it to use the default: "' + defaultIndex + '"');
        $state.index = config.get('defaultIndex');
      } else {
        notify.warning(reason + 'Please set a default index to continue.');
        $location.url('/settings/indices');
        return;
      }
    }

    $scope.opts = {
      // number of records to fetch, then paginate through
      sampleSize: config.get('discover:sampleSize'),
      // max length for summaries in the table
      maxSummaryLength: 100,
      // Index to match
      index: $state.index,
      savedSearch: savedSearch,
      indexPatternList: indexPatternList,
    };

    // So we can watch it.
    $scope.time = timefilter.time;

    // stores the complete list of fields
    $scope.fields = null;

    var init = _.once(function () {
      return $scope.updateDataSource()
      .then(function () {
        setFields();

        // state fields that shouldn't trigger a fetch when changed
        var ignoreStateChanges = ['columns'];

        // listen for changes, and relisten everytime something happens
        $state.onUpdate(function (changed) {
          if (_.contains(changed, 'columns')) {
            $scope.fields.forEach(function (field) {
              field.display = _.contains($state.columns, field.name);
            });
          }

          // if we only have ignorable changes, do nothing
          if (_.difference(changed, ignoreStateChanges).length) $scope.fetch();
        });

        // TODO: Switch this to watching time.string when we implement it
        $scope.$watchCollection('globalState.time', function (newTime, oldTime) {
          // don't fetch unless there was a previous value and the values are not loosly equal
          if (!_.isUndefined(oldTime) && !angular.equals(newTime, oldTime)) $scope.fetch();
        });

        $scope.$watch('state.sort', function (sort) {
          if (!sort) return;

          // get the current sort from {key: val} to ["key", "val"];
          var currentSort = _.pairs($scope.searchSource.get('sort')).pop();

          // if the searchSource doesn't know, tell it so
          if (!angular.equals(sort, currentSort)) $scope.fetch();
        });

        $scope.$watch('opts.timefield', function (timefield) {
          timefilter.enabled(!!timefield);
        });

        $scope.searchSource.onError(function (err) {
          console.log(err);
          notify.error('An error occured with your request. Reset your inputs and try again.');
        }).catch(notify.fatal);

        return setupVisualization().then(function () {
          $scope.updateTime();
          init.complete = true;
          $scope.$emit('application.load');
        });
      });
    });

    $scope.opts.saveDataSource = function () {
      return $scope.updateDataSource()
      .then(function () {
        savedSearch.id = savedSearch.title;

        return savedSearch.save()
        .then(function () {
          notify.info('Saved Data Source "' + savedSearch.title + '"');
          if (savedSearch.id !== $route.current.params.id) {
            $location.url(globalState.writeToUrl('/discover/' + encodeURIComponent(savedSearch.id)));
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

        var sort = $state.sort;
        var timeField = $scope.searchSource.get('index').timeFieldName;
        var totalSize = $scope.size || 500;

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

        var eventComplete = notify.event('segmented fetch');

        return segmentedFetch.fetch({
          searchSource: $scope.searchSource,
          totalSize: sortBy === 'non-time' ? false : totalSize,
          direction: sortBy === 'time' ? sort[1] : 'desc',
          first: function (resp) {
            $scope.hits = resp.hits.total;
            $scope.rows = [];
            $scope.rows.fieldCounts = {};
          },
          each: notify.timed('handle each segment', function (resp, req) {
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
              // when we are resorting on each segment we need to rebuild the
              // counts each time
              if (sortFn && hit._formatted) return;

              // Flatten the fields
              hit._source = _.flattenWith('.', hit._source);

              hit._formatted = _.mapValues(hit._source, function (value, name) {
                // add up the counts for each field name
                if (counts[name]) counts[name] = counts[name] + 1;
                else counts[name] = 1;

                return ($scope.formatsByName[name] || defaultFormat).convert(value);
              });

              hit._formatted._source = angular.toJson(hit._source);
            });

            // ensure that the meta fields always have a "row count" equal to the number of rows
            metaFields.forEach(function (fieldName) {
              counts[fieldName] = $scope.rows.length;
            });

            // apply the field counts to the field list
            $scope.fields.forEach(function (field) {
              field.rowCount = counts[field.name] || 0;
            });
          }),
          eachMerged: function (merged) {
            $scope.mergedEsResp = merged;
          }
        })
        .finally(eventComplete);
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
      .query(!$state.query ? null : $state.query);

      // get the current indexPattern
      var indexPattern = $scope.searchSource.get('index');
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

        if (indexPattern !== $scope.searchSource.get('index')) {
          // set the index on the savedSearch
          $scope.searchSource.index(indexPattern);
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
      $scope.formatsByName = {};
      $state.columns = $state.columns || [];

      if (!indexPattern) return;

      _.sortBy(indexPattern.fields, 'name').forEach(function (field) {
        _.defaults(field, currentState[field.name]);
        // clone the field and add it's display prop
        var clone = _.assign({}, field, {
          format: field.format, // this is a getter, so we need to copy it over manually
          display: columnObjects[field.name] || false,
          rowCount: $scope.rows ? $scope.rows.fieldCounts[field.name] : 0
        });

        $scope.fields.push(clone);
        $scope.fieldsByName[field.name] = clone;
        $scope.formatsByName[field.name] = field.format;
      });

      refreshColumns();
    }

    // TODO: On array fields, negating does not negate the combination, rather all terms
    $scope.filterQuery = function (field, value, operation) {
      value = _.isArray(value) ? value : [value];
      operation = operation || '+';

      var indexPattern = $scope.searchSource.get('index');
      indexPattern.popularizeField(field, 1);

      _.each(value, function (clause) {
        var filter = field + ':"' + addSlashes(clause) + '"';
        var regex = '[\\+-]' + regexEscape(filter) + '\\s*';

        $state.query = $state.query.replace(new RegExp(regex), '') +
          ' ' + operation + filter;
      });

      $scope.fetch();
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
      if (loadingVis) return loadingVis;


      // we shouldn't have a vis, delete it
      if (!$scope.opts.timefield && $scope.vis) {
        $scope.vis.destroy();
        delete $scope.vis;
      }
      // we shouldn't have one, or already do, return whatever we already have
      if (!$scope.opts.timefield || $scope.vis) return Promise.resolve($scope.vis);

      var vis = new AdhocVis({
        searchSource: $scope.searchSource,
        type: 'histogram',
        listeners: {
          onClick: function (e) {
            console.log(e);
            timefilter.time.from = moment(e.point.x);
            timefilter.time.to = moment(e.point.x + e.data.ordered.interval);
            timefilter.time.mode = 'absolute';
            $scope.$apply();
          },
          onBrush: function (e) {
            var from = moment(e.range[0]);
            var to = moment(e.range[1]);

            if (to - from === 0) return;

            timefilter.time.from = from;
            timefilter.time.to = to;
            timefilter.time.mode = 'absolute';
            $scope.$apply();
          }
        },
        config: {
          metric: {
            configs: [{
              agg: 'count',
            }]
          },
          segment: {
            configs: [{
              agg: 'date_histogram',
              field: $scope.opts.timefield,
              interval: $state.interval,
              min_doc_count: 0,
            }]
          },
          group: { configs: [] },
          split: { configs: [] },
        }
      });

      // stash this promise so that other calls to setupVisualization will have to wait
      loadingVis = vis.init()
      .then(function () {
        // expose the vis so that the visualize directive can get started
        $scope.vis = vis;

        // wait for visualize directive to emit that it's ready before resolving
        return new Promise(function (resolve) {
          $scope.$on('ready:vis', resolve);
        });
      })
      .then(function () {
        // clear the loading flag
        loadingVis = null;
        return vis;
      });

      return loadingVis;
    };

    init();
  });
});
