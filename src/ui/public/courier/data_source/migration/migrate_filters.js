import { migrateRangeFilter } from './migrate_range';

export function migrateFilters(filters, indexPatterns) {

  const migrationsPromises = filters.map((filter) => {
    if (!filter.meta || !filter.meta.index) return filter;

    return Promise.resolve(indexPatterns.get(filter.meta.index))
    .then((indexPattern) => {
      // Migration functions will return undefined if they do not apply
      // so we can simply try them in order with ||
      return migrateRangeFilter(filter, indexPattern) || filter;
    });

  });

  return Promise.all(migrationsPromises);
}
