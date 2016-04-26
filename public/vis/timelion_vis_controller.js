define(function (require) {
  require('plugins/timelion/directives/chart_directive');
  require('plugins/timelion/directives/interval/interval');

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
      console.log(_.pluck(queryFilter.getFilters(), 'query'));
      var expression = $scope.vis.params.expression;
      if (!expression) return;

      $http.post('../api/timelion/run', {
        sheet: [expression],
        extended: {
          es: {
            filters: _.pluck(queryFilter.getFilters(), 'query')
          }
        },
        time: _.extend(timefilter.time, {
          interval: $scope.vis.params.interval,
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
    $scope.$watchMulti(['vis.params.expression', 'vis.params.interval'], $scope.search);

    // When the time filter changes
    $scope.$listen(timefilter, 'fetch', $scope.search);

    // When a filter is added to the filter bar?
    $scope.$listen(queryFilter, 'fetch', $scope.search);

    // When auto refresh happens
    $scope.$on('courier:searchRefresh', $scope.search);

    $scope.$on('fetch', $scope.search);

  });
});
