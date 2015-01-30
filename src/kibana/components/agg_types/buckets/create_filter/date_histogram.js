define(function (require) {
  return function createDateHistogramFilterProvider(Private) {
    var moment = require('moment');
    var buildRangeFilter = require('components/filter_manager/lib/range');

    return function (aggConfig, key) {
      var interval = aggConfig.params.buckets.getInterval();

      var intNotation = interval.toJSON();
      var time = moment(key);
      var start = +time;
      var end = +time.add(interval).subtract(1, 'ms');

      return buildRangeFilter(aggConfig.params.field, {
        gte: start,
        lte: end
      }, aggConfig.vis.indexPattern);
    };

  };
});
