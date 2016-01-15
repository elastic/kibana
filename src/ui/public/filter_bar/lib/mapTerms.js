import _ from 'lodash';
define(function (require) {
  return function mapTermsProvider(Promise, courier) {
    return function (filter) {
      var key;
      var value;
      var field;
      if (filter.match) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          key = _.keys(filter.match)[0];
          field = indexPattern.fields.byName[key];
          value = filter.match[key].query;
          value = field.format.convert(value);
          return { key: key, value: value };
        });
      }
      return Promise.reject(filter);
    };
  };
});
