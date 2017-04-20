import { has } from 'lodash';
import { migrateRangeFilter } from './migrate_range';

export function migrateFilters(filters, indexPatterns) {

  const migrationsPromises = filters.map((filter) => {
    if (!has(filter, 'meta.index') && !has(filter, 'index')) return filter;

    const index = filter.index || filter.meta.index;

    return Promise.resolve(indexPatterns.get(index))
    .then((indexPattern) => {
      // Migration functions will return undefined if they do not apply
      // so we can simply try them in order with ||
      return migrateRangeFilter(filter, indexPattern) || filter;
    });

  });

  return Promise.all(migrationsPromises);
}
