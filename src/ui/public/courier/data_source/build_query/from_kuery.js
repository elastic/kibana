import _ from 'lodash';
import { fromKueryExpression, toElasticsearchQuery, nodeTypes } from '../../../kuery';

export function buildQueryFromKuery(queries) {
  const queryASTs = _.map(queries, query => fromKueryExpression(query.query));
  const compoundQueryAST = nodeTypes.compound.buildNode({ children: queryASTs });
  const kueryQuery = toElasticsearchQuery(compoundQueryAST);
  return kueryQuery.bool;
}


