define(function (require) {
  var _ = require('utils/mixins');

  var settingsHtml = require('text!../partials/settings.html');

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
    $scope.columns = null;

    // index pattern interval options
    $scope.intervals = intervals;
    $scope.interval = intervals[0];

    var initialQuery = search.get('query');
    $scope.query = initialQuery ? initialQuery.query_string.query : '';

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

    $scope.sort = ['_score', 'desc'];

    $scope.getSort = function () {
      return $scope.sort;
    };

    $scope.setSort = function (field, order) {
      var sort = {};
      sort[field] = order;
      search.sort([sort]);
      $scope.sort = [field, order];
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


    $scope.fetch = function () {
      if (!$scope.fields) getFields();
      search
        .size($scope.opts.sampleSize)
        .query(!$scope.query ? null : {
          query_string: {
            query: $scope.query
          }
        });

      if ($scope.opts.index !== search.get('index')) {
        // set the index on the savedSearch
        search.index($scope.opts.index);
        // clear the columns and fields, then refetch when we do a search
        $scope.columns = $scope.fields = null;
      }

      // fetch just this savedSearch
      search.fetch();
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
          $scope.columns = $scope.columns || [];

          // Inject source into list;
          $scope.fields.push({name: '_source', type: 'source', display: false});

          _(fields)
            .keys()
            .sort()
            .each(function (name) {
              var field = fields[name];
              field.name = name;

              _.defaults(field, currentState[name]);
              $scope.fields.push(field);
            });


          refreshColumns();
          defer.resolve();
        }, defer.reject);

      return defer.promise.then(function () {
        activeGetFields = null;
      });
    }

    $scope.toggleField = function (name) {
      var field = _.find($scope.fields, { name: name });

      // toggle the display property
      field.display = !field.display;

      if ($scope.columns.length === 1 && $scope.columns[0] === '_source') {
        $scope.columns = _.toggleInOut($scope.columns, name);
        $scope.columns = _.toggleInOut($scope.columns, '_source');
        _.find($scope.fields, {name: '_source'}).display = false;

      } else {
        $scope.columns = _.toggleInOut($scope.columns, name);
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
      $scope.columns = _.intersection($scope.columns, fields);

      // If no columns remain, use _source
      if (!$scope.columns.length) {
        $scope.toggleField('_source');
      }
    }

    $scope.$emit('application.load');
  });
});