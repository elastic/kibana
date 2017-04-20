import _ from 'lodash';

export function FilterBarLibMapMatchProvider(Promise, courier) {
  return function (filter) {
    if (filter.query && filter.query.match) {
      return courier
      .indexPatterns
      .get(filter.meta.index).then(function (indexPattern) {
        const type = 'match';
        const key = _.keys(filter.query.match)[0];
        const field = indexPattern.fields.byName[key];
        const { query } = filter.query.match[key];
        const value = field.format.convert(query);
        return { type, key, value };
      });
    }
    return Promise.reject(filter);
  };
}
