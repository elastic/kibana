define(function (require) {
  require('plugins/timelion/directives/chart_directive');
  require('plugins/timelion/directives/refresh_hack');


  var _ = require('lodash');
  var module = require('ui/modules').get('kibana/timelion_vis', ['kibana']);
  module.controller('TimelionVisController', function ($scope, Private, Notifier, $http, $rootScope, timefilter) {

    var queryFilter = Private(require('ui/filter_bar/query_filter'));
    var timezone = Private(require('plugins/timelion/services/timezone'))();
    var notify = new Notifier({
      location: 'Timelion'
    });

    $scope.search = function run() {
      var expression = $scope.vis.params.expression;
      if (!expression) return;

      $http.post('../api/timelion/run', {
        sheet: [expression],
        time: _.extend(timefilter.time, {
          interval: '1d', // Make this automatic
          timezone: timezone
        }),
      })
      // data, status, headers, config
      .success(function (resp) {
        $scope.sheet = resp.sheet;
      })
      .error(function (resp) {
        $scope.sheet = [];
        var err = new Error(resp.message);
        err.stack = resp.stack;
        notify.error(err);
      });
    };

    // This is bad, there should be a single event that triggers a refresh of data.

    // When the expression updates
    $scope.$watch('vis.params.expression', $scope.search);

    // When the time filter changes
    $scope.$listen(timefilter, 'fetch', $scope.search);

    // When a filter is added to the filter bar?
    $scope.$listen(queryFilter, 'fetch', $scope.search);

    // When auto refresh happens
    $scope.$on('courier:searchRefresh', $scope.search);

    $scope.$on('fetch', function () {
      $scope.search();
      console.log('Double up LOL');
    });

  });
});

/*
define(function (require) {
  var _ = require('lodash');
  var module = require('ui/modules').get('kibana/timelion_vis', ['kibana']);

  module.controller('TimelionVisController', function ($scope, $http, timefilter, Private, Notifier, $rootScope) {
    var timezone = Private(require('plugins/timelion/services/timezone'))();
    var notify = new Notifier({
      location: 'Timelion'
    });

    function run() {
      var expression = $scope.vis.params.expression;
      if (!expression) return;

      $http.post('../api/timelion/run', {
        sheet: $scope.state.sheet,
        time: _.extend(timefilter.time, {
          interval: '1d', // Make this automatic
          timezone: timezone
        }),
      })
      // data, status, headers, config
      .success(function (resp) {
        $scope.sheet = resp.sheet;
      })
      .error(function (resp) {
        $scope.sheet = [];
        var err = new Error(resp.message);
        err.stack = resp.stack;
        notify.error(err);
      });
    };

    $rootScope.$watch('courier:searchRefresh', run);
    $scope.$watch('vis.params.expression', function (expression) {
      console.log(expression);
    });
  });
});
*/
