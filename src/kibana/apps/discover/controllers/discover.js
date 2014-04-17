define(function (require) {
  var _ = require('utils/mixins');

  var settingsHtml = require('text!../partials/settings.html');

  require('notify/notify');

  var app = require('modules').get('app/discover', [
    'kibana/notify',
    'kibana/courier'
  ]);

  require('directives/timepicker');
  require('services/state');
  require('directives/fixed_scroll');
  require('filters/moment');

  require('routes')
  .when('/discover/:id?', {
    templateUrl: 'kibana/apps/discover/index.html',
    reloadOnSearch: false,
    resolve: {
      savedSearch: function (savedSearches, $route) {
        return savedSearches.get($route.current.params.id);
      },
      patternList: function (es, configFile, $location, $q) {
        // TODO: This is inefficient because it pulls down all of the cached mappings for every
        // configured pattern instead of only the currently selected one.
        return es.search({
          index: configFile.kibanaIndex,
          type: 'mapping',
          size: 50000,
          body: {
            query: {match_all: {}},
          }
        })
        .then(function (res) {
          return res.hits.hits;
        });
      }
    }
  });

  var intervals = [
    { display: '', val: null },
    { display: 'Hourly', val: 'hourly' },
    { display: 'Daily', val: 'daily' },
    { display: 'Weekly', val: 'weekly' },
    { display: 'Monthly', val: 'monthly' },
    { display: 'Yearly', val: 'yearly' }
  ];

  app.controller('discover', function ($scope, config, $q, $route, savedSearches, courier, createNotifier, $location,
    state, es, configFile) {
    var notify = createNotifier({
      location: 'Discover'
    });

    // the saved savedSearch
    var savedSearch = $route.current.locals.savedSearch;

    // the actual courier.SearchSource
    var searchSource = savedSearch.searchSource;

    /* Manage state & url state */
    var initialQuery = searchSource.get('query');


    function loadState() {
      $scope.state = state.get();
      $scope.state = _.defaults($scope.state, {
        query: initialQuery ? initialQuery.query_string.query : '',
        columns: ['_source'],
        sort: ['_score', 'desc'],
        index: config.get('defaultIndex')
      });
    }

    loadState();

    // Check that we have any index patterns before going further, and that index being requested
    // exists.
    if (!$route.current.locals.patternList.length ||
      !_.find($route.current.locals.patternList, {_id: $scope.state.index})) {
      $location.path('/settings/indices');
      return;
    }

    function init() {
      setFields();
      updateDataSource();
    }

    $scope.opts = {
      // number of records to fetch, then paginate through
      sampleSize: 500,
      // max length for summaries in the table
      maxSummaryLength: 100,
      // Index to match
      index: $scope.state.index,
      savedSearch: savedSearch,
      patternList: $route.current.locals.patternList,
      time: {}
    };

    $scope.opts.saveDataSource = function () {
      savedSearch.id = savedSearch.title;

      savedSearch.save()
      .then(function () {
        notify.info('Saved Data Source "' + savedSearch.title + '"');
        if (savedSearch.id !== $route.current.params.id) {
          $location.url('/discover/' + savedSearch.id);
        }
      }, notify.error);
    };

    // stores the complete list of fields
    $scope.fields = null;

    // index pattern interval options
    $scope.intervals = intervals;
    $scope.interval = intervals[0];

    // the index to use when they don't specify one
    $scope.$on('change:config.defaultIndex', function (event, val) {
      if (!$scope.opts.index) {
        $scope.opts.index = val;
        $scope.fetch();
      }
    });

    // If the URL changes, we re-fetch, no matter what changes.
    $scope.$on('$locationChangeSuccess', function () {
      $scope.state = state.get();

      // We have no state, don't try to refresh until we do
      if (_.isEmpty($scope.state)) return;

      updateDataSource();
      // TODO: fetch just this savedSearch
      courier.fetch();
    });

        // the index to use when they don't specify one
    $scope.$watch('opts.index', function (val) {
      if (!val) return;
      updateDataSource();
      $scope.fetch();
    });

    // Bind a result handler. Any time scope.fetch() is executed this gets called
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
      console.log('An error');
    });

    $scope.$on('$destroy', savedSearch.destroy);

    $scope.getSort = function () {
      return $scope.state.sort;
    };

    $scope.setSort = function (field, order) {
      var sort = {};
      sort[field] = order;
      searchSource.sort([sort]);
      $scope.state.sort = [field, order];
      $scope.fetch();
    };

    $scope.toggleConfig = function () {
      // Close if already open
      if ($scope.configTemplate === settingsHtml) {
        delete $scope.configTemplate;
      } else {
        $scope.configTemplate = settingsHtml;
      }
    };

    $scope.toggleTimepicker = function () {
      var timepickerHtml = '<kbn-timepicker from="opts.time.from" to="opts.time.to" mode="timepickerMode"></kbn-timepicker>';
      // Close if already open
      if ($scope.configTemplate === timepickerHtml) {
        delete $scope.configTemplate;
      } else {
        $scope.configTemplate = timepickerHtml;
      }
    };

    $scope.resetQuery = function () {
      $scope.state.query = initialQuery ? initialQuery.query_string.query : '';
      $scope.fetch();
    };

    function updateDataSource() {
      if ($scope.opts.index !== searchSource.get('index')) {
        // set the index on the savedSearch
        searchSource.index($scope.opts.index);

        $scope.state.index = $scope.opts.index;
        delete $scope.fields;
        delete $scope.columns;

        setFields();

        // clear the columns and fields, then refetch when we do a savedSearch
        //$scope.state.columns = $scope.fields = null;
      }

      var sort = {};
      sort[$scope.state.sort[0]] = $scope.state.sort[1];

      searchSource
        .size($scope.opts.sampleSize)
        .query(!$scope.state.query ? null : {
          query_string: {
            query: $scope.state.query
          }
        })
        .sort([sort]);

      if (!!$scope.opts.timefield) {
        searchSource
        .aggs({
          events: {
            date_histogram: {
              field: $scope.opts.timefield,
              interval: '12h',
              format: 'yyyy-MM-dd'
            }
          }
        });
      }
    }

    $scope.fetch = function () {
      // We only set the state on data refresh
      state.set($scope.state);
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
      var fields = _.findLast($scope.opts.patternList, {_id: $scope.opts.index})._source;

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
      }
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

    init();
    $scope.$emit('application.load');
  });
});