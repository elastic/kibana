import _ from 'lodash';
define(function (require) {
  return function buildQueryFilter(query, index) {
    return {
      query: query,
      meta: {
        index: index
      }
    };
  };
});
