const FetchFieldsProvider = (Notifier, $http) => {
  const notify = new Notifier({ location: 'Metrics' });
  return (indexPatterns = ['*']) => {
    if (!Array.isArray(indexPatterns)) indexPatterns = [indexPatterns];
    return new Promise((resolve, reject) => {
      const fields = {};

      Promise.all(indexPatterns.map(pattern => {
        return $http.get(`../api/metrics/fields?index=${pattern}`)
          .success(resp => {
            if (resp.length && pattern) {
              fields[pattern] = resp;
            }
          })
          .error(resp => {
            const err = new Error(resp.message);
            err.stack = resp.stack;
            notify.error(err);
            reject(err);
          });
      })).then(() => {
        resolve(fields);
      });
    });
  };
};

export { FetchFieldsProvider };

