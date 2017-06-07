import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { uiModules } from 'ui/modules';
import timezoneProvider from 'plugins/timelion/services/timezone';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import 'plugins/timelion/directives/chart/chart';
import 'plugins/timelion/directives/interval/interval';
import 'ui/state_management/app_state';

define(function (require) {
  const _ = require('lodash');
  const module = uiModules.get('kibana/timelion_vis', ['kibana']);
  module.controller('TimelionVisController', function ($scope, $element, Private, Notifier, $http, $rootScope, timefilter) {
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const timezone = Private(timezoneProvider)();
    const dashboardContext = Private(dashboardContextProvider);

    const notify = new Notifier({
      location: 'Timelion'
    });

    $scope.search = function run() {
      const expression = $scope.vis.params.expression;
      if (!expression) return;

      $http.post('../api/timelion/run', {
        sheet: [expression],
        extended: {
          es: {
            filter: dashboardContext()
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
        const err = new Error(resp.message);
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

    $scope.$on('renderComplete', event => {
      event.stopPropagation();
      $element.trigger('renderComplete');
    });

  });
});
