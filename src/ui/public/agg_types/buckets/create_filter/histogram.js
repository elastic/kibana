import buildRangeFilter from 'ui/filter_manager/lib/range';

export default function createHistogramFilterProvider() {
  return function (aggConfig, key) {
    const value = parseInt(key, 10);

    return buildRangeFilter(
      aggConfig.params.field,
      { gte: value, lt: value + aggConfig.params.interval },
      aggConfig.vis.indexPattern,
      aggConfig.fieldFormatter()(key)
    );
  };
}
