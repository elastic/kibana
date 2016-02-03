import buildRangeFilter from 'ui/filter_manager/lib/range';
define(function (require) {

  return function createHistogramFitlerProvider(Private) {
    return function (aggConfig, key) {
      var value = parseInt(key, 10);

      return buildRangeFilter(
        aggConfig.params.field,
        {gte: value, lt: value + aggConfig.params.interval},
        aggConfig.vis.indexPattern,
        aggConfig.fieldFormatter()(key)
      );
    };
  };
});
