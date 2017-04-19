import _ from 'lodash';
export default function mapTermsProvider(Promise, courier) {
  return function (filter) {
    if (filter.query && filter.query.terms) {
      return courier
      .indexPatterns
      .get(filter.meta.index).then(function (indexPattern) {
        const type = 'terms';
        const key = _.keys(filter.query.terms)[0];
        const field = indexPattern.fields.byName[key];
        const value = (
          filter.query.terms[key]
          .map(term => field.format.convert(term))
          .join(', ')
        );
        return { type, key, value };
      });
    }
    return Promise.reject(filter);
  };
}
