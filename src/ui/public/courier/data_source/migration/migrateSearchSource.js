import Promise from 'bluebird';
import { migrateRangeFilter } from './migrateFilters';
import _ from 'lodash';

export function MigrateSearchSourceProvider(indexPatterns) {

  return function (searchSource) {
    return Promise.map(searchSource.getOwn('filter'), (filter) => {
      const indexPatternId = _.get(filter, 'meta.index');

      if (indexPatternId) {
        const indexPattern = indexPatterns.get(filter.meta.index);

        return Promise.resolve(indexPattern)
          .then((indexPattern) => {
            if (filter.range) {
              return migrateRangeFilter(filter, indexPattern);
            }
            else {
              return filter;
            }
          });
      }
      else {
        return filter;
      }
    }
    )
    .then((migratedFilters) => {
      searchSource.set('filter', migratedFilters);
    });
  };

}
