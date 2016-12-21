export default (
  Notifier,
  $http
) => {
  const notify = new Notifier({ location: 'Metrics' });
  return $scope => (indexPattern = '*') => {
    $http.get(`../api/metrics/fields?index=${indexPattern}`)
      .success(resp => {
        $scope.fields = resp;
      })
      .error(resp => {
        $scope.visData = {};
        const err = new Error(resp.message);
        err.stack = resp.stack;
        notify.error(err);
      });
  };
};

