define(function (require) {
  var _ = require('lodash');
  return function mapTermsProvider(Promise, courier) {
    return function (filter) {
      var key, value, field;
      if (filter.query && filter.query.match) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          key = _.keys(filter.query.match)[0];
          field = indexPattern.fields.byName[key];
          value = filter.query.match[key].query;
          value = field.format.convert(value);
          return { key: key, value: value };
        });
      }
      return Promise.reject(filter);
    };
  };
});
