/**
 * Injects a WHERE clause immediately after the source command (FROM/TS/etc.) of an ES|QL query.
 *
 * Filters reference source-level fields, so a WHERE has to run before any transformational
 * command (STATS, KEEP, DROP, RENAME) that may rename or remove those fields. Appending the
 * WHERE to the end of the pipeline would break valid filters; injecting it right after the
 * source keeps them at the earliest safe position.
 *
 * Returns the original query unchanged when the expression is empty or no source command
 * can be found in the query.
 *
 * @param esql - The base ES|QL query
 * @param whereExpression - The WHERE expression body (without the leading `WHERE`)
 */
export declare function injectWhereClauseAfterSourceCommand(esql: string, whereExpression: string): string;
