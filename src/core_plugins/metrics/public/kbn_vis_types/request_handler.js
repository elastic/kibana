import { validateInterval } from '../lib/validate_interval';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import { timezoneProvider } from 'ui/vis/lib/timezone';

const MetricsRequestHandlerProvider = function (Private, Notifier, config, timefilter, $http) {
  const dashboardContext = Private(dashboardContextProvider);
  const notify = new Notifier({ location: 'Metrics' });

  return {
    name: 'metrics',
    handler: function (vis, { uiState, timeRange }) {
      const timezone = Private(timezoneProvider)();
      return new Promise((resolve) => {
        const panel = vis.params;
        const uiStateObj = uiState.get(panel.type, {});
        const parsedTimeRange = timefilter.calculateBounds(timeRange);
        const scaledDataFormat = config.get('dateFormat:scaled');
        const dateFormat = config.get('dateFormat');
        if (panel && panel.id) {
          const params = {
            timerange: { timezone, ...parsedTimeRange },
            filters: [dashboardContext()],
            panels: [panel],
            state: uiStateObj
          };

          try {
            const maxBuckets = config.get('metrics:max_buckets');
            validateInterval(parsedTimeRange, panel, maxBuckets);
            const httpResult = $http.post('../api/metrics/vis/data', params)
              .then(resp => ({ dateFormat, scaledDataFormat, timezone, ...resp.data }))
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
