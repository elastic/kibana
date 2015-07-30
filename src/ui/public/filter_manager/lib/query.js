define(function (require) {
  var _ = require('lodash');
  return function buildQueryFilter(query, index) {
    return {
      query: query,
      meta: {
        index: index
      }
    };
  };
});