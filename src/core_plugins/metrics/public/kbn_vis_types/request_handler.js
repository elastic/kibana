import { validateInterval } from '../lib/validate_interval';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';

const MetricsRequestHandlerProvider = function (Private, Notifier, config, timefilter, $http) {
  const dashboardContext = Private(dashboardContextProvider);
  const notify = new Notifier({ location: 'Metrics' });

  return {
    name: 'metrics',
    handler: function (vis /*, appState, uiState*/) {

      return new Promise((resolve) => {
        const panel = vis.params;
        if (panel && panel.id) {
          const params = {
            timerange: timefilter.getBounds(),
            filters: [dashboardContext()],
            panels: [panel]
          };

          try {
            const maxBuckets = config.get('metrics:max_buckets');
            validateInterval(timefilter, panel, maxBuckets);
            return $http.post('../api/metrics/vis/data', params)
              .success(resp => {

                const patternsToFetch = [];
                // Fetch any missing index patterns
                if (!vis.fields) vis.fields = {};

                if (!vis.fields[vis.params.index_pattern]) {
                  patternsToFetch.push(vis.params.index_pattern);
                }

                vis.params.series.forEach(series => {
                  if (series.override_index_pattern &&
                    !vis.fields[series.series_index_pattern]) {
                    patternsToFetch.push(series.series_index_pattern);
                  }
                });

                if (vis.params.annotations) {
                  vis.params.annotations.forEach(item => {
                    if (item.index_pattern &&
                      !vis.fields[item.index_pattern]) {
                      patternsToFetch.push(item.index_pattern);
                    }
                  });
                }

                resolve(resp);
              })
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
