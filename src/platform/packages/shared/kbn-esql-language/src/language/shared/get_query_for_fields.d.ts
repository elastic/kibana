import type { ESQLAstQueryExpression } from '@elastic/esql/types';
/**
 * This function is used to build the query that will be used to compute the
 * fields available at the final position. It is robust to final partial commands
 * e.g. "FROM logs* | EVAL foo = 1 | EVAL "
 *
 * Generally, this is the user's query up to the end of the previous command, but there
 * are special cases for multi-expression EVAL and FORK branches.
 *
 * IMPORTANT: the AST nodes in the new query still reference locations in the original query text
 *
 * @param queryString The original query string
 * @param root
 * @returns
 */
export declare function getQueryForFields(queryString: string, root: ESQLAstQueryExpression): ESQLAstQueryExpression;
