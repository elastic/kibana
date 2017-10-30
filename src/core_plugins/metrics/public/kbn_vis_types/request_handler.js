import { validateInterval } from '../lib/validate_interval';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import { timezoneProvider } from 'ui/vis/lib/timezone';

const MetricsRequestHandlerProvider = function (Private, Notifier, config, timefilter, $http) {
  const dashboardContext = Private(dashboardContextProvider);
  const notify = new Notifier({ location: 'Metrics' });

  return {
    name: 'metrics',
    handler: function (vis, appState, uiState) {
      const timezone = Private(timezoneProvider)();
      return new Promise((resolve) => {
        const panel = vis.params;
        const uiStateObj = uiState.get(panel.type, {});
        const timeRange = vis.params.timeRange || timefilter.getBounds();
        if (panel && panel.id) {
          const params = {
            timerange: { timezone, ...timeRange },
            filters: [dashboardContext()],
            panels: [panel],
            state: uiStateObj
          };

          try {
            const maxBuckets = config.get('metrics:max_buckets');
            validateInterval(timeRange, panel, maxBuckets);
            const httpResult = $http.post('../api/metrics/vis/data', params)
              .then(resp => resp.data)
              .catch(resp => { throw resp.data; });

            return httpResult
              .then(resolve)
              .catch(resp => {
                resolve({});
                const err = new Error(resp.message);
                err.stack = resp.stack;
                notify.error(err);
              });
          } catch (e) {
            notify.error(e);
            return resolve();
          }
        }
      });
    }
  };
};

export { MetricsRequestHandlerProvider };
