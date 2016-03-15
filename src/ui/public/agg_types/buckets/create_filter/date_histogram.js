import moment from 'moment';
import buildRangeFilter from 'ui/filter_manager/lib/range';
export default function createDateHistogramFilterProvider(Private) {

  return function (agg, key) {
    var start = moment(key);
    var interval = agg.buckets.getInterval();

    return buildRangeFilter(agg.params.field, {
      gte: start.valueOf(),
      lte: start.add(interval).subtract(1, 'ms').valueOf()
    }, agg.vis.indexPattern);
  };

};
