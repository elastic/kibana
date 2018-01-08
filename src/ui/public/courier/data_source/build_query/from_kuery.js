import _ from 'lodash';
import { fromKueryExpression, toElasticsearchQuery, nodeTypes } from '../../../kuery';

export function buildQueryFromKuery(indexPattern, queries) {
  const queryASTs = _.map(queries, query => fromKueryExpression(query.query));
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


