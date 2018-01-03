import _ from 'lodash';
import { fromKueryExpression, fromKqlExpression, toElasticsearchQuery, nodeTypes } from '../../../kuery';

export function buildQueryFromKuery(indexPattern, queries) {
  const queryASTs = _.map(queries, query => fromKueryExpression(query.query));
  return buildQuery(indexPattern, queryASTs);
}

export function buildQueryFromKql(indexPattern, queries) {
  const queryASTs = _.map(queries, query => fromKqlExpression(query.query));
  return buildQuery(indexPattern, queryASTs);
}

function buildQuery(indexPattern, queryASTs) {
  const compoundQueryAST = nodeTypes.function.buildNode('and', queryASTs);
  const kueryQuery = toElasticsearchQuery(compoundQueryAST, indexPattern);
  return {
    must: [],
    filter: [],
    should: [],
    must_not: [],
    ...kueryQuery.bool
  };
}
