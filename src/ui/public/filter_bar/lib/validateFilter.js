define(function (require) {
  var _ = require('lodash');
  return function validateFilter(courier, Promise) {
    return function (filter) {
      var terms = filter.query && filter.query.match;

      if (terms) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          return !!indexPattern.fields.byName[_.keys(filter.query.match)[0]];
        });
      } else {
        return Promise.resolve(false);
      }
    };
  };
});
