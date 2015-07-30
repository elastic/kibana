define(function (require) {
  var _ = require('lodash');
  return function validateFilter(courier, Promise) {
    return function (filter) {
      var terms = filter.query && filter.query.match;

      if (terms) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          var key = _.keys(filter.query.match)[0];
          var hasField = !!indexPattern.fields.byName[key];
          var hasQuery = terms[key].query;
          return hasField && hasQuery;
        });
      } else {
        return Promise.resolve(false);
      }
    };
  };
});
