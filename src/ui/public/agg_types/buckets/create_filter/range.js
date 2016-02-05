import buildRangeFilter from 'ui/filter_manager/lib/range';
define(function (require) {
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
