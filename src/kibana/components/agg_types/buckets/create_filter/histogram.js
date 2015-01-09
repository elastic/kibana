define(function (require) {
  var buildRangeFilter = require('components/filter_manager/lib/range');

  return function createHistogramFitlerProvider(Private) {
    return function (aggConfig, key) {
      var value = parseInt(key, 10);

      return buildRangeFilter(aggConfig.params.field, {
        gte: value,
        lt: value + aggConfig.params.interval
      }, aggConfig.vis.indexPattern);
    };
  };
});
