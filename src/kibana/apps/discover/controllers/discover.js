define(function (require) {
  var _ = require('utils/mixins');

  var settingsHtml = require('text!../partials/settings.html');
  var timepickerHtml = require('text!partials/timepicker.html');

  var app = require('modules').get('app/discover');

  var intervals = [
    { display: '', val: null },
    { display: 'Hourly', val: 'hourly' },
    { display: 'Daily', val: 'daily' },
    { display: 'Weekly', val: 'weekly' },
    { display: 'Monthly', val: 'monthly' },
    { display: 'Yearly', val: 'yearly' }
  ];

  app.controller('discover', function ($scope, config, $q, $route, savedSearches, courier, createNotifier, $location) {
    var notify = createNotifier({
      location: 'Discover'
    });

    var search = $route.current.locals.search;
    if (!search) return notify.fatal('search failed to load');

    $scope.state = {};

    // Will need some watchers here to see if anything that implies a refresh changes
    $scope.$on('$routeUpdate', function () {
      $scope.state = $location.search();
    });

    $scope.opts = {
      // number of records to fetch, then paginate through
      sampleSize: 500,
      // max length for summaries in the table
      maxSummaryLength: 100,
      // Index to match
      index: 'logstash-*',
      timefield: '@timestamp',
      savedSearch: search
    };

    // track the initial state of the search
    var searchIsPhantom = search.phantom;
    $scope.opts.saveDataSource = function () {
      search.save()
      .then(function () {
        notify.info('Saved Data Source "' + search.details.name + '"');
        if (searchIsPhantom) {
          searchIsPhantom = false;
          $location.url('/discover/' + search.get('id'));
        }
      }, notify.error);
    };

    // stores the complete list of fields
    $scope.fields = null;

    // stores the fields we want to fetch
    $scope.state.columns = null;

    // index pattern interval options
    $scope.intervals = intervals;
    $scope.interval = intervals[0];

    // TODO: URL arg should override this
    var initialQuery = search.get('query');
    $scope.state.query = initialQuery ? initialQuery.query_string.query : '';

    // the index to use when they don't specify one
    config.$watch('discover.defaultIndex', function (val) {
      if (!val) return config.set('discover.defaultIndex', '_all');
      if (!$scope.opts.index) {
        $scope.opts.index = val;
        $scope.fetch();
      }
    });

    search
      .$scope($scope)
      .inherits(courier.rootSearchSource)
      .on('results', function (res) {
        if (!$scope.fields) getFields();

        $scope.rows = res.hits.hits;
      });

    $scope.state.sort = ['_score', 'desc'];

    $scope.getSort = function () {
      return $scope.state.sort;
    };

    $scope.setSort = function (field, order) {
      var sort = {};
      sort[field] = order;
      search.sort([sort]);
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
      if ($scope.opts.index !== search.get('index')) {
        // set the index on the savedSearch
        search.index($scope.opts.index);
        // clear the columns and fields, then refetch when we do a search
        $scope.state.columns = $scope.fields = null;
      }

      if (!$scope.fields) getFields();

      search
        .size($scope.opts.sampleSize)
        .query(!$scope.state.query ? null : {
          query_string: {
            query: $scope.state.query
          }
        });
    }

    $scope.fetch = function () {
      updateDataSource();
      // fetch just this savedSearch
      search.fetch();
    };

    $scope.updateState = function () {
      //$location.search($scope.state);
    };

    var activeGetFields;
    function getFields() {
      var defer = $q.defer();

      if (activeGetFields) {
        activeGetFields.then(function () {
          defer.resolve();
        });
        return;
      }

      var currentState = _.transform($scope.fields || [], function (current, field) {
        current[field.name] = {
          display: field.display
        };
      }, {});

      search
        .getFields()
        .then(function (fields) {
          if (!fields) return;

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
              $scope.fields.push(_.defaults(field, {display: false}));
            });


          refreshColumns();
          defer.resolve();
        }, defer.reject);

      return defer.promise.then(function () {
        activeGetFields = null;
      });
    }

    // TODO: On array fields, negating does not negate the combination, rather all terms
    $scope.filterQuery = function (field, value, operation) {
      value = _.isArray(value) ? value : [value];
      operation = operation || '+';

      _.each(value, function (clause) {
        $scope.state.query = $scope.state.query + ' ' + operation + field + ':"' + addSlashes(clause) + '"';
      });

      $scope.fetch();
    };

    $scope.toggleField = function (name) {
      console.log('toggling', name);

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

    $scope.refreshFieldList = function () {
      search.clearFieldCache(function () {
        getFields(function () {
          $scope.fetch();
        });
      });
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

      $scope.updateState();
    }

    var addSlashes = function (str) {
      if (!_.isString(str)) return str;
      str = str.replace(/\\/g, '\\\\');
      str = str.replace(/\'/g, '\\\'');
      str = str.replace(/\"/g, '\\"');
      str = str.replace(/\0/g, '\\0');
      return str;
    };

    updateDataSource();
    $scope.$emit('application.load');
  });
});