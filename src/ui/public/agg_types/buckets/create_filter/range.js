import buildRangeFilter from 'ui/filter_manager/lib/range';
export default function createRangeFilterProvider(Private) {
  return function (aggConfig, key) {
    return buildRangeFilter(
      aggConfig.params.field,
      key,
      aggConfig.vis.indexPattern,
      aggConfig.fieldFormatter()(key)
    );
  };
}
