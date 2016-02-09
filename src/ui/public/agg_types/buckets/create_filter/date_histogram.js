define(function (require) {
  return function createDateHistogramFilterProvider(Private) {
    var moment = require('moment');
    var buildRangeFilter = require('ui/filter_manager/lib/range');

    return function (agg, key) {
      var start = moment(key);
      var interval = agg.buckets.getInterval();

      var filter = buildRangeFilter(agg.params.field, {
        gte: start.valueOf(),
        lte: start.add(interval).subtract(1, 'ms').valueOf()
      }, agg.vis.indexPattern);
      if (agg.params.nested) {
        filter = { 'nested' : { 'query' : { 'bool' : { 'must' : [{filter}]}}, 'path' : agg.params.nested.path}};
      }
      return filter;
    };

  };
});
