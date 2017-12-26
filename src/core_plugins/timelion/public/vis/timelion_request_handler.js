import _ from 'lodash';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';

import { timezoneProvider } from 'ui/vis/lib/timezone';
const TimelionRequestHandlerProvider = function (Private, Notifier, $http, $rootScope, timefilter) {
  const timezone = Private(timezoneProvider)();
  const dashboardContext = Private(dashboardContextProvider);

  const notify = new Notifier({
    location: 'Timelion'
  });

  return {
    name: 'timelion',
    handler: function (vis /*, appState, uiState, queryFilter*/) {

      return new Promise((resolve, reject) => {
        const expression = vis.params.expression;
        if (!expression) return;

        let timeFilter = timefilter.time;
        if (vis.params.timeRange) {
          timeFilter = {
            mode: 'absolute',
            from: vis.params.timeRange.min.toJSON(),
            to: vis.params.timeRange.max.toJSON()
          };
        }
        const httpResult = $http.post('../api/timelion/run', {
          sheet: [expression],
          extended: {
            es: {
              filter: dashboardContext()
            }
          },
          time: _.extend(timeFilter, {
            interval: vis.params.interval,
            timezone: timezone
          }),
        })
          .then(resp => resp.data)
          .catch(resp => { throw resp.data; });

        httpResult
          .then(function (resp) {
            resolve(resp);
          })
          .catch(function (resp) {
            const err = new Error(resp.message);
            err.stack = resp.stack;
            notify.error(err);
            reject(err);
          });
      });
    }
  };
};

export { TimelionRequestHandlerProvider };
