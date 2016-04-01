define(function (require) {
  let _ = require('lodash');
  return function DecorateQuery(config) {
    /**
     * Decorate queries with default parameters
     * @param {query} query object
     * @returns {object}
     */
    return function (query) {
      let queryOptions = config.get('query:queryString:options');

      if (_.has(query, 'query_string.query')) {
        _.extend(query.query_string, queryOptions);
      }

      return query;
    };
  };
});

