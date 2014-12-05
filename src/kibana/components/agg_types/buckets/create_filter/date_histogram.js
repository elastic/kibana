define(function (require) {
  var moment = require('moment');
  var interval = require('utils/interval');

  return function createDateHistogramFilterProvider(Private) {
    var calculateInterval = Private(require('components/agg_types/param_types/_calculate_interval'));
    return function (aggConfig, key) {
      var result = calculateInterval(aggConfig);
      var date = moment(key).add(result.interval, 'ms');
      var filter = { meta: {}, range: {} };
      filter.range[aggConfig.params.field.name] = {
        gte: parseInt(key, 10),
        lte: date.valueOf()
      };
      filter.meta.index = aggConfig.vis.indexPattern.id;
      return filter;
    };

  };
});
