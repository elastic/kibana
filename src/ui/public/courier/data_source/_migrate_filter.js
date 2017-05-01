import _ from 'lodash';

export function migrateFilter(filter) {
  if (filter.match) {
    const fieldName = Object.keys(filter.match)[0];
    const params = filter.match[fieldName];

    if (_.isPlainObject(params) && params.type === 'phrase') {
      const newFilter = {
        match_phrase: _.clone(filter.match, true)
      };
      delete newFilter.match_phrase[fieldName].type;
      return newFilter;
    }
  }

  return filter;
}

