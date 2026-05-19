import type { ESQLAstQueryExpression } from '@elastic/esql/types';
/**
 * Finds the innermost subquery containing the cursor position and determines if the query contains subqueries.
 *
 * Example: FROM a, (FROM b, (FROM c | WHERE |))
 *                                        ↑ cursor
 * Returns: { subQuery: ESQLAstQueryExpression for "FROM c | WHERE", queryContainsSubqueries: true }
 */
export declare function findSubquery(queryAst: ESQLAstQueryExpression, offset: number): {
    subQuery: ESQLAstQueryExpression | null;
    queryContainsSubqueries: boolean;
};
