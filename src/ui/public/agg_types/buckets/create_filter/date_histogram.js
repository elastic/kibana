define(function (require) {
  return function createDateHistogramFilterProvider(Private) {
    let moment = require('moment');
    let buildRangeFilter = require('ui/filter_manager/lib/range');

    return function (agg, key) {
      let start = moment(key);
      let interval = agg.buckets.getInterval();

      return buildRangeFilter(agg.params.field, {
        gte: start.valueOf(),
        lte: start.add(interval).subtract(1, 'ms').valueOf()
      }, agg.vis.indexPattern);
    };

  };
});
