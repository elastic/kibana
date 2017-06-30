import _ from 'lodash';

export function buildQueryFromLucene(queries, decorateQuery) {
  const combinedQueries = _.map(queries, (query) => {
    if (_.isString(query.query)) {
      const luceneQueryString = query.query === '' ? '*' : query.query;
      return decorateQuery({ query_string: { query: luceneQueryString } });
    }

    return decorateQuery(query.query);
  });

  return {
    must: [].concat(combinedQueries),
    filter: [],
    should: [],
    must_not: [],
  };
}
