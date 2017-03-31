import { migrateFilters } from './migrate_filters';

export function MigrateSearchSourceProvider(indexPatterns) {

  return function (searchSource) {
    if (!searchSource) return;

    const filters = searchSource.getOwn('filter') || [];
    return migrateFilters(filters, indexPatterns)
    .then((migratedFilters) => {
      searchSource.set('filter', migratedFilters);
    });
  };

}
