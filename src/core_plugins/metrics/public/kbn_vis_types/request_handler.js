import { validateInterval } from '../lib/validate_interval';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import { jstz as tzDetect } from 'jstimezonedetect';
import moment from 'moment';

const MetricsRequestHandlerProvider = function (Private, Notifier, config, timefilter, $http) {
  const dashboardContext = Private(dashboardContextProvider);
  const notify = new Notifier({ location: 'Metrics' });

  return {
    name: 'metrics',
    handler: function (vis /*, appState, uiState, queryFilter*/) {

      let timezone = config.get('dateFormat:tz', 'Browser');
      if (timezone === 'Browser') {
        timezone = tzDetect.determine().name();
        if (!timezone) {
          timezone = moment().format('Z');
        }

      }

      return new Promise((resolve) => {
        const panel = vis.params;
        if (panel && panel.id) {
          const params = {
            timerange: { timezone, ...timefilter.getBounds() },
            filters: [dashboardContext()],
            panels: [panel]
          };

          try {
            const maxBuckets = config.get('metrics:max_buckets');
            validateInterval(timefilter, panel, maxBuckets);
            return $http.post('../api/metrics/vis/data', params)
              .success(resolve)
              .error(resp => {
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
