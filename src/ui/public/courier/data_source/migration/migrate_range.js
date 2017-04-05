import buildRangeFilter from 'ui/filter_manager/lib/range';

export function migrateRangeFilter(filter, indexPattern) {
  if (!filter.range) return;

  const fieldName = Object.keys(filter.range)[0];
  const field = indexPattern.fields.byName[fieldName];
  const params = filter.range[fieldName];

  const newFilter = buildRangeFilter(field, params, indexPattern);
  Object.assign(newFilter.meta, filter.meta);

  return newFilter;
}
