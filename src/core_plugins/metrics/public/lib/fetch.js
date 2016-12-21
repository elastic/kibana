export default (
  timefilter,
  Private,
  Notifier,
  $http
) => {
  const dashboardContext = Private(require('plugins/timelion/services/dashboard_context'));
  const notify = new Notifier({ location: 'Metrics' });
  return $scope => () => {
    const panel = $scope.model;
    if (panel && panel.id) {
      const params = {
        timerange: timefilter.getBounds(),
        filters: [dashboardContext()],
        panels: [panel]
      };

      $http.post('../api/metrics/vis/data', params)
        .success(resp => {
          $scope.visData = resp;
        })
        .error(resp => {
          $scope.visData = {};
          const err = new Error(resp.message);
          err.stack = resp.stack;
          notify.error(err);
        });
    }
  };
};

