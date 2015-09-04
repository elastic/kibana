define(function (require) {
  var buildRangeFilter = require('components/filter_manager/lib/range');
  return function createRangeFilterProvider(Private) {
    return function (aggConfig, params) {
      return buildRangeFilter(
        aggConfig.params.field,
        params,
        aggConfig.vis.indexPattern,
        aggConfig.fieldFormatter()(params)
      );
    };
  };
});
