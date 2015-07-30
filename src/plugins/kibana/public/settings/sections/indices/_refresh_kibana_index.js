define(function (require) {
  return function RefreshKibanaIndexFn(es, kbnIndex) {
    return function () {
      return es.indices.refresh({
        index: kbnIndex
      });
    };
  };
});
