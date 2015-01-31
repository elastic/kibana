define(function (require) {
  return function createDateHistogramFilterProvider(Private) {
    var moment = require('moment');
    var buildRangeFilter = require('components/filter_manager/lib/range');

    return function (aggConfig, key) {
      var start = moment(key);
      var interval = aggConfig.params.buckets.getInterval();

      return buildRangeFilter(aggConfig.params.field, {
        gte: start.valueOf(),
        lte: start.add(interval).subtract(1, 'ms').valueOf()
      }, aggConfig.vis.indexPattern);
    };

  };
});
