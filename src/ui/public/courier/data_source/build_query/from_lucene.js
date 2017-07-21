import _ from 'lodash';
import { luceneStringToDsl } from './lucene_string_to_dsl';

export function buildQueryFromLucene(queries, decorateQuery) {
  const combinedQueries = _.map(queries, (query) => {
    const queryDsl = luceneStringToDsl(query.query);
    return decorateQuery(queryDsl);
  });

  return {
    must: [].concat(combinedQueries),
    filter: [],
    should: [],
    must_not: [],
  };
}
