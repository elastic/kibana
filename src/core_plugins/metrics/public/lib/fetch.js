import { validateInterval } from './validate_interval';
export default (
  timefilter,
  Private,
  Notifier,
  $http,
  config
) => {
  const dashboardContext = Private(require('../../../timelion/public/services/dashboard_context'));
  const notify = new Notifier({ location: 'Metrics' });
  return $scope => () => {
    const panel = $scope.model;
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
            $scope.visData = resp;
          })
          .error(resp => {
            $scope.visData = {};
            const err = new Error(resp.message);
            err.stack = resp.stack;
            notify.error(err);
          });
      } catch (e) {
        notify.error(e);
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  };
};

