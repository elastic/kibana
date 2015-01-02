define(function (require) {
  var _ = require('lodash');
  return function DecorateQuery(config) {
    /**
     * Decorate queries with default parameters
     * @param {query} query object
     * @returns {object}
     */
    return function (query) {
      var queryOptions = config.get('query:queryString:options');

      if (_.deepHas(query, 'query_string.query')) {
        _.extend(query.query_string, queryOptions);
      }

      return query;
    };
  };
});

