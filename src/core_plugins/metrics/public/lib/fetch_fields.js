const FetchFieldsProvider = (Notifier, $http) => {
  const notify = new Notifier({ location: 'Metrics' });
  return (indexPatterns = ['*']) => {
    if (!Array.isArray(indexPatterns)) indexPatterns = [indexPatterns];
    return new Promise((resolve, reject) => {
      const fields = {};

      Promise.all(indexPatterns.map(pattern => {
        const httpResult = $http.get(`../api/metrics/fields?index=${pattern}`)
          .then(resp => resp.data)
          .catch(resp => { throw resp.data; });

        return httpResult
          .then(resp => {
            if (resp.length && pattern) {
              fields[pattern] = resp;
            }
          })
          .catch(resp => {
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
