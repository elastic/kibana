define(function (require) {
  return function RefreshKibanaIndexFn(es, configFile) {
    return function () {
      return es.indices.refresh({
        index: configFile.kibana_index
      });
    };
  };
});
