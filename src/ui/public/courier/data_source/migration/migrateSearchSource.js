import buildRangeFilter from 'ui/filter_manager/lib/range';
import _ from 'lodash';

export function MigrateSearchSourceProvider() {

  return function (searchSource) {
    // TODO Figure out how to convert ALL filters, not just "own". Does this get called for every search source already?
    //      if so maybe we don't have to do anything special

    const indexPattern = searchSource.getOwn('index');

    _.map(searchSource.getOwn('filter'), (filter) => {
      if (filter.range) {
        const fieldName = Object.keys(filter.range)[0];
        const params = filter.range[fieldName];

        _.set(filter, 'meta.field', fieldName);
        _.set(filter, 'meta.type', 'range');
        _.set(filter, 'meta.params', params);
      }
      else return filter;
    });
  };

}
