define(function (require) {
  let buildRangeFilter = require('ui/filter_manager/lib/range');

  return function createHistogramFitlerProvider(Private) {
    return function (aggConfig, key) {
      let value = parseInt(key, 10);

      return buildRangeFilter(
        aggConfig.params.field,
        {gte: value, lt: value + aggConfig.params.interval},
        aggConfig.vis.indexPattern,
        aggConfig.fieldFormatter()(key)
      );
    };
  };
});
