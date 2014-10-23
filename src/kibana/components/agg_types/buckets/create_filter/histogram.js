define(function (require) {
  return function createHistogramFitlerProvider(Private) {
    return function (aggConfig, key) {
      var value = parseInt(key, 10);
      var filter = { range: {} };
      filter.range[aggConfig.params.field.name] = {
        gte: value,
        lt: value + aggConfig.params.interval
      };
      filter.$$indexPattern = aggConfig.vis.indexPattern.id;
      return filter;
    };
  };
});
