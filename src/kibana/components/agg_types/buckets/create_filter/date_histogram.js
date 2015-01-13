define(function (require) {
  var moment = require('moment');
  var interval = require('utils/interval');
  var buildRangeFilter = require('components/filter_manager/lib/range');

  return function createDateHistogramFilterProvider(Private) {
    var calculateInterval = Private(require('components/agg_types/param_types/_calculate_interval'));
    return function (aggConfig, key) {
      var result = calculateInterval(aggConfig);
      var date = moment(key).add(result.interval, 'ms');

      return buildRangeFilter(aggConfig.params.field, {
        gte: parseInt(key, 10),
        lte: date.valueOf()
      }, aggConfig.vis.indexPattern);
    };

  };
});
