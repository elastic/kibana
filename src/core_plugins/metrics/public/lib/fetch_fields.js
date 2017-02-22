export default (
  Notifier,
  $http
) => {
  const notify = new Notifier({ location: 'Metrics' });
  return $scope => (indexPatterns = ['*']) => {
    if (!Array.isArray(indexPatterns)) indexPatterns = [indexPatterns];
    return Promise.all(indexPatterns.map(pattern => {
      return $http.get(`../api/metrics/fields?index=${pattern}`)
        .success(resp => {
          if (!$scope.fields) $scope.fields = {};
          if (resp.length && pattern) {
            $scope.fields[pattern] = resp;
          }
        })
        .error(resp => {
          $scope.visData = {};
          const err = new Error(resp.message);
          err.stack = resp.stack;
          notify.error(err);
        });
    }));
  };
};

