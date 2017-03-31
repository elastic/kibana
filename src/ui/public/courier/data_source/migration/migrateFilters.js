import buildRangeFilter from 'ui/filter_manager/lib/range';

export function migrateRangeFilter(filter, indexPattern) {
  const fieldName = Object.keys(filter.range)[0];
  const field = indexPattern.fields.byName[fieldName];
  const params = filter.range[fieldName];

  return buildRangeFilter(field, params, indexPattern);
}
