import _ from 'lodash';

import { matchAll } from './match_all';

export function buildQueryFromLucene(queries, decorateQuery) {
  const combinedQueries = _.map(queries, (query) => {
    if (_.isString(query.query)) {
      if (query.query.trim() === '') {
        return matchAll;
      }
      return decorateQuery({ query_string: { query: query.query } });
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
