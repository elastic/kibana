define(function (require) {
  var _ = require('utils/mixins');
  var angular = require('angular');
  var moment = require('moment');
  var settingsHtml = require('text!../partials/settings.html');
  var saveHtml = require('text!../partials/save_search.html');
  var loadHtml = require('text!../partials/load_search.html');

  var interval = require('utils/interval');
  var datemath = require('utils/datemath');

  require('notify/notify');
  require('directives/timepicker');
  require('directives/fixed_scroll');
  require('filters/moment');
  require('apps/settings/services/index_patterns');
  require('state_management/app_state');
  require('services/timefilter');

  var app = require('modules').get('app/discover', [
    'kibana/notify',
    'kibana/courier'
  ]);

  require('routes')
  .when('/discover/:id?', {
    templateUrl: 'kibana/apps/discover/index.html',
    reloadOnSearch: false,
    resolve: {
      savedSearch: function (savedSearches, $route, $location, Notifier, courier) {
        return savedSearches.get($route.current.params.id).catch(function (e) {
          if (e instanceof courier.errors.SavedObjectNotFound) {
            new Notifier({location: 'Dashboard'}).error(e.message);
            $location.path('/discover');
            return false;
          } else {
            throw e;
          }
        });
      },
      indexPatternList: function (indexPatterns) {
        return indexPatterns.getIds();
      }
    }
  });


  app.controller('discover', function ($scope, config, courier, $route, savedSearches, savedVisualizations,
    Notifier, $location, globalState, AppState, timefilter) {

    var notify = new Notifier({
      location: 'Discover'
    });

    // the saved savedSearch
    var savedSearch = $route.current.locals.savedSearch;
    $scope.$on('$destroy', savedSearch.destroy);

    // list of indexPattern id's
    var indexPatternList = $route.current.locals.indexPatternList;

    // the actual courier.SearchSource
    var searchSource = savedSearch.searchSource;

    /* Manage state & url state */
    var initialQuery = searchSource.get('query');

    var stateDefaults = {
      query: initialQuery ? initialQuery.query_string.query : '',
      columns: ['_source'],
      sort: ['_score', 'desc'],
      index: config.get('defaultIndex'),
    };

    var $state = $scope.state = new AppState(stateDefaults);

    // Check that we have any index patterns before going further, and that index being requested
    // exists.
    if (!indexPatternList.length) {
      $location.path('/settings/indices');
      return;
    }

    if (!_.contains(indexPatternList, $state.index)) {
      notify.warning('The index specified in the URL is not a configured pattern. Using the default: ' + config.get('defaultIndex'));
      $state.index = config.get('defaultIndex');
    }

    $scope.opts = {
      // number of records to fetch, then paginate through
      sampleSize: 500,
      // max length for summaries in the table
      maxSummaryLength: 100,
      // Index to match
      index: $state.index,
      savedSearch: savedSearch,
      indexPatternList: indexPatternList,
    };

    // So we can watch it.
    $scope.time = timefilter.time;

    // TODO: Switch this to watching time.string when we implement it
    $scope.$watchCollection('time', _.bindKey($scope, 'fetch'));

    // when we init the visualization, we re-run the fetch;
    $scope.$on('ready:vis', _.bindKey($scope, 'fetch'));

    // stores the complete list of fields
    $scope.fields = null;

    var init = _.once(function () {
      return setFields()
      .then(function () {
        updateDataSource();

        // state fields that shouldn't trigger a fetch when changed
        var ignoreStateChanges = ['columns'];

        // listen for changes, and relisten everytime something happens
        $state.onUpdate(function (changed) {
          // if we only have ignorable changes, do nothing
          if (_.difference(changed, ignoreStateChanges).length) $scope.fetch();
        });

        $scope.$watch('state.sort', function (sort) {
          if (!sort) return;

          // get the current sort from {key: val} to ["key", "val"];
          var currentSort = _.pairs(searchSource.get('sort')).pop();

          // if the searchSource doesn't know, tell it so
          if (!angular.equals(sort, currentSort)) $scope.fetch();
        });

        searchSource.onError().then(function searchError(err) {
          console.log(err);
          notify.error('An error occured with your request. Reset your inputs and try again.');

          return searchSource.onError().then(searchError);
        });

        // Bind a result handler. Any time searchSource.fetch() is executed this gets called
        // with the results
        searchSource.onResults().then(function onResults(resp) {
          $scope.rows = resp.hits.hits;
          $scope.chart = !!resp.aggregations ? {rows: [{columns: [{
            label: 'Events over time',
            xAxisLabel: 'DateTime',
            yAxisLabel: 'Hits',
            layers: [
              {
                key: 'somekey',
                values: _.map(resp.aggregations.events.buckets, function (bucket) {
                  return { y: bucket.doc_count, x: bucket.key_as_string };
                })
              }
            ]
          }]}]} : undefined;

          return searchSource.onResults().then(onResults);
        }).catch(function (err) {
          console.log('An error', err);
        });

        $scope.$emit('application.load');
      });
    });

    $scope.opts.saveDataSource = function () {
      updateDataSource();
      savedSearch.id = savedSearch.title;

      savedSearch.save()
      .then(function () {
        notify.info('Saved Data Source "' + savedSearch.title + '"');
        if (savedSearch.id !== $route.current.params.id) {
          $location.url(globalState.writeToUrl('/discover/' + savedSearch.id));
        }
      }, notify.error);
    };

    $scope.fetch = function () {
      updateDataSource();

      if ($scope.opts.timefield) timefilter.enabled(true);
      if (!$scope.opts.timefield && $scope.vis) delete $scope.vis;
      if ($scope.opts.timefield && !$scope.vis) setupVisualization();

      $state.commit();
      if (courier.started()) courier.fetch();
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
      $state.query = stateDefaults.query;
      $state.sort = stateDefaults.sort;
      $state.columns = stateDefaults.columns;
      $scope.fetch();
    };

    function updateDataSource() {
      var chartOptions;

      if ($scope.opts.index !== searchSource.get('index')) {
        // set the index on the savedSearch
        searchSource.index($scope.opts.index);

        $state.index = $scope.opts.index;
        delete $scope.fields;
        delete $scope.columns;

        setFields();
      }

      searchSource
        .size($scope.opts.sampleSize)
        .sort(_.zipObject([$state.sort]))
        .query(!$scope.state.query ? null : {
          query_string: {
            query: $scope.state.query
          }
        });
    }

    // This is a hacky optimization for comparing the contents of a large array to a short one.
    function arrayToKeys(array, value) {
      var obj = {};
      _.each(array, function (key) {
        obj[key] = value || true;
      });
      return obj;
    }

    function setFields() {
      return searchSource.getFields($scope.opts.index)
      .then(function (fields) {
        var currentState = _.transform($scope.fields || [], function (current, field) {
          current[field.name] = {
            display: field.display
          };
        }, {});

        if (!fields) return;

        var columnObjects = arrayToKeys($scope.state.columns);

        $scope.fields = [];
        $scope.state.columns = $scope.state.columns || [];

        // Inject source into list;
        $scope.fields.push({name: '_source', type: 'source', display: false});

        _(fields)
          .keys()
          .sort()
          .each(function (name) {
            var field = fields[name];
            field.name = name;

            _.defaults(field, currentState[name]);
            $scope.fields.push(_.defaults(field, {display: columnObjects[name] || false}));
          });

        // TODO: timefield should be associated with the index pattern, this is a hack
        // to pick the first date field and use it.
        var timefields = _.find($scope.fields, {type: 'date'});
        if (!!timefields) {
          $scope.opts.timefield = timefields.name;
        } else {
          delete $scope.opts.timefield;
        }

        refreshColumns();
      });
    }

    // TODO: On array fields, negating does not negate the combination, rather all terms
    $scope.filterQuery = function (field, value, operation) {
      value = _.isArray(value) ? value : [value];
      operation = operation || '+';

      _.each(value, function (clause) {
        var filter = field + ':"' + addSlashes(clause) + '"';
        var regex = '[\\+-]' + regexEscape(filter) + '\\s*';

        $scope.state.query = $scope.state.query.replace(new RegExp(regex), '') +
          ' ' + operation + filter;
      });

      $scope.fetch();
    };

    $scope.toggleField = function (name) {
      var field = _.find($scope.fields, { name: name });

      // toggle the display property
      field.display = !field.display;

      if ($scope.state.columns.length === 1 && $scope.state.columns[0] === '_source') {
        $scope.state.columns = _.toggleInOut($scope.state.columns, name);
        $scope.state.columns = _.toggleInOut($scope.state.columns, '_source');
        _.find($scope.fields, {name: '_source'}).display = false;

      } else {
        $scope.state.columns = _.toggleInOut($scope.state.columns, name);
      }

      refreshColumns();
    };

    function refreshColumns() {
      // Get all displayed field names;
      var fields = _.pluck(_.filter($scope.fields, function (field) {
        return field.display;
      }), 'name');

      // Make sure there are no columns added that aren't in the displayed field list.
      $scope.state.columns = _.intersection($scope.state.columns, fields);

      // If no columns remain, use _source
      if (!$scope.state.columns.length) {
        $scope.toggleField('_source');
        return;
      }

      $scope.fetch();
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

    var setupVisualization = function () {
      if ($scope.vis) return;

      searchSource.disable();
      var prom = savedVisualizations.tempForDiscover(searchSource)
      .then(function (vis) {
        if ($scope.vis !== prom) return;

        $scope.vis = vis;

        var chartOptions = interval.calculate(timefilter.time.from, timefilter.time.to, 100);

        var config = vis.segment.configs.pop() || {};
        config.agg = 'date_histogram';
        config.field = $scope.opts.timefield;
        config.interval = chartOptions.interval + 'ms';
        config.min_doc_count = 0;
        config.format = chartOptions.format;
        var bounds = timefilter.getBounds();
        config.extended_bounds = {
          min: bounds.min,
          max: bounds.max
        };

        vis.segment.configs.push(config);
        vis.writeAggs();
        // enable the source, but wait for the visualization to be ready before running
        searchSource.enable();
      });

      // set it to the promise, so that we don't try to fetch it again
      $scope.vis = prom;
      return prom;
    };

    init();
  });
});