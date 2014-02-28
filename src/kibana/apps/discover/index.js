define(function (require, module, exports) {
  var angular = require('angular');
  var _ = require('lodash');

  require('directives/table');
  require('./field_chooser');
  require('services/saved_searches');

  var app = angular.module('app/discover');

  var intervalOptions = [
    { display: '', val: null },
    { display: 'Hourly', val: 'hourly' },
    { display: 'Daily', val: 'daily' },
    { display: 'Weekly', val: 'weekly' },
    { display: 'Monthly', val: 'monthly' },
    { display: 'Yearly', val: 'yearly' }
  ];

  app.controller('discover', function ($scope, config, $q, $routeParams, savedSearches, courier) {
    var source;
    if ($routeParams.id) {
      source = savedSearches.get($routeParams.id);
    } else {
      source = savedSearches.create();
    }

    // stores the complete list of fields
    $scope.fields = null;

    // stores the fields we want to fetch
    $scope.columns = null;

    // index pattern interval options
    $scope.intervalOptions = intervalOptions;
    $scope.interval = $scope.intervalOptions[0];

    // the index to use when they don't specify one
    config.$watch('discover.defaultIndex', function (val) {
      if (!val) return config.set('discover.defaultIndex', '_all');
      if (!$scope.index) {
        $scope.index = val;
        $scope.fetch();
      }
    });

    source
      .$scope($scope)
      .inherits(courier.rootSearchSource)
      .on('results', function (res) {
        if (!$scope.fields) getFields();

        $scope.rows = res.hits.hits;
      });

    $scope.fetch = function () {
      if (!$scope.fields) getFields();
      source
        .size(500)
        .query(!$scope.query ? null : {
          query_string: {
            query: $scope.query
          }
        });

      if ($scope.sort) {
        var sort = {};
        sort[$scope.sort.name] = 'asc';
        source.sort(sort);
      }

      if ($scope.index !== source.get('index')) {
        // set the index on the data source
        source.index($scope.index);
        // clear the columns and fields, then refetch when we so a search
        $scope.columns = $scope.fields = null;
      }

      // fetch just this datasource
      source.fetch();
    };

    var activeGetFields;
    function getFields() {
      var defer = $q.defer();

      if (!source.get('index')) {
        // Without an index there is nothing to do here.
        defer.resolve();
        return defer.promise;
      }

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

      source
        .getFields()
        .then(function (fields) {
          $scope.fields = [];
          $scope.columns = [];

          _(fields)
            .keys()
            .sort()
            .each(function (name) {
              var field = fields[name];
              field.name = name;
              _.defaults(field, currentState[name]);

              if (field.display) $scope.columns.push(name);
              $scope.fields.push(field);
            });

          if (!$scope.columns.length) {
            $scope.columns.push('_source');
          }

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

      // collect column names for displayed fields and sort
      $scope.columns = _.transform($scope.fields, function (cols, field) {
        if (field.display) cols.push(field.name);
      }, []).sort();

      if (!$scope.columns.length) {
        $scope.columns.push('_source');
      }
    };

    $scope.refreshFieldList = function () {
      source.clearFieldCache(function () {
        getFields(function () {
          $scope.fetch();
        });
      });
    };

    $scope.$emit('application.load');
  });
});