import _ from 'lodash';

export default function DecorateQuery(config) {
  /**
   * Decorate queries with default parameters
   * @param {query} query object
   * @returns {object}
   */
  return function (query) {
    const queryOptions = config.get('query:queryString:options');

    if (_.has(query, 'query_string.query')) {
      _.extend(query.query_string, queryOptions);
    }

    return query;
  };
}
