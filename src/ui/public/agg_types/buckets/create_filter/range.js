define(function (require) {
  let buildRangeFilter = require('ui/filter_manager/lib/range');
  return function createRangeFilterProvider(Private) {
    return function (aggConfig, key) {
      return buildRangeFilter(
        aggConfig.params.field,
        key,
        aggConfig.vis.indexPattern,
        aggConfig.fieldFormatter()(key)
      );
    };
  };
});
