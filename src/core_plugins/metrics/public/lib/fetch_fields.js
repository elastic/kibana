export default (
  Notifier,
  $http
) => {
  const notify = new Notifier({ location: 'Metrics' });
  return $scope => (indexPattern = '*') => {
    return $http.get(`../api/metrics/fields?index=${indexPattern}`)
      .success(resp => {
        if (!$scope.fields) $scope.fields = {};
        if (resp.length && indexPattern) {
          $scope.fields[indexPattern] = resp;
        }
      })
      .error(resp => {
        $scope.visData = {};
        const err = new Error(resp.message);
        err.stack = resp.stack;
        notify.error(err);
      });
  };
};

