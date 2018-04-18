import { buildRangeFilter } from 'ui/filter_manager/lib/range';

export function createFilterRange(aggConfig, key) {
  return buildRangeFilter(
    aggConfig.params.field,
    key,
    aggConfig.vis.indexPattern,
    aggConfig.fieldFormatter()(key)
  );
}
