import { fromLegacyKueryExpression, fromKueryExpression, toElasticsearchQuery, nodeTypes } from '../../../kuery';
import { documentationLinks } from '../../../documentation_links';

const queryDocs = documentationLinks.query;

export function buildQueryFromKuery(indexPattern, queries = []) {
  const queryASTs = queries.map((query) => {
    try {
      return fromKueryExpression(query.query);
    }
    catch (parseError) {
      try {
        fromLegacyKueryExpression(query.query);
      }
      catch (legacyParseError) {
        throw parseError;
      }
      throw new Error(
        `It looks like you're using an outdated Kuery syntax. See what changed in the [docs](${queryDocs.kueryQuerySyntax})!`
      );
    }
  });
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
