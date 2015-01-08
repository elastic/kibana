define(function (require) {
  var buildRangeFilter = require('components/filter_manager/lib/range');
  return function createRangeFilterProvider(Private) {
    return function (aggConfig, key) {
      var splits = key.split(/\-/);
      var gte = Number(splits[0]);
      var lte = Number(splits[1]);
      return buildRangeFilter(aggConfig.params.field, {
        gte: gte,
        lte: lte
      });
    };
  };
});
