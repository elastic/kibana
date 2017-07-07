import _ from 'lodash';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';

const TimelionRequestHandlerProvider = function (Private, Notifier, $http, $rootScope, timefilter) {
  const timezone = Private(require('plugins/timelion/services/timezone'))();
  const dashboardContext = Private(dashboardContextProvider);

  const notify = new Notifier({
    location: 'Timelion'
  });

  return {
    name: 'timelion',
    handler: function (vis /*, appState, uiState */) {

      return new Promise((resolve, reject) => {
        console.log('[timelion] get');

        const expression = vis.params.expression;
        if (!expression) return;

        $http.post('../api/timelion/run', {
          sheet: [expression],
          extended: {
            es: {
              filter: dashboardContext()
            }
          },
          time: _.extend(timefilter.time, {
            interval: vis.params.interval,
            timezone: timezone
          }),
        })
          .success(function (resp) {
            resolve(resp);
          })
          .error(function (resp) {
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
