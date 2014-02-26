define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  require('directives/table');
  require('css!./styles/main.css');

  var app = angular.module('app/discover', []);

  var sizeOptions = [
    { display: '30', val: 30 },
    { display: '50', val: 50 },
    { display: '80', val: 80 },
    { display: '125', val: 125 },
    { display: '250', val: 250 },
    { display: 'Unlimited', val: null },
  ];

  var intervalOptions = [
    { display: '', val: null },
    { display: 'Hourly', val: 'hourly' },
    { display: 'Daily', val: 'daily' },
    { display: 'Weekly', val: 'weekly' },
    { display: 'Monthly', val: 'monthly' },
    { display: 'Yearly', val: 'yearly' }
  ];

  app.controller('discover', function ($scope, courier, config) {
    var source = courier.rootSearchSource.extend()
      .size(30)
      .$scope($scope)
      .on('results', function (res) {
        if (!$scope.fields) getFields();
        $scope.rows = res.hits.hits;
      });

    // stores the complete list of fields
    $scope.fields = [];

    // stores the fields we want to fetch
    $scope.columns = [];

    // At what interval are your index patterns
    $scope.intervalOptions = intervalOptions;
    $scope.interval = $scope.intervalOptions[0];

    // options to control the size of the queries
    $scope.sizeOptions = sizeOptions;
    $scope.size = $scope.sizeOptions[0];

    // watch the discover.defaultIndex config value for changes
    config.$watch('discover.defaultIndex', function (val) {
      if (!val) {
        config.set('discover.defaultIndex', '_all');
        return;
      }
      // only set if datasource doesn't have an index
      if (!source.get('index')) $scope.index = val;
    });

    $scope.$watch('index', function (val) {
      // set the index on the data source
      source.index(val);
      // clear the columns and fields, then refetch when we so a search
      $scope.columns = $scope.fields = null;
    });

    $scope.$watch('query', function (query) {
      if (query) {
        source.query({
          query_string: {
            query: query
          }
        });
      } else {
        // clear the query
        source.query(null);
      }
    });

    $scope.$watch('size', function (selectedSize) {
      source.size(selectedSize.val);
    });

    $scope.reset = function () {
      // the check happens only when the results come in; prevents a race condition
      // if (!$scope.fields) getFields();
      courier.abort();
      courier.fetch();
    };

    function getFields() {
      source.getFields(function (err, fields) {
        $scope.fields = fields;
        $scope.columns = _.keys(fields);
        source.source({
          include: $scope.columns
        });
      });
    }

  });
});