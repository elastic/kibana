export interface ESQLIndexPatterns {
    indexPattern: string;
    indexPatternWithoutRemoteClusterPrefix: string;
}
export declare function getIndexPatternsFromESQLQuery(esql?: string): ESQLIndexPatterns;
/**
 * Retrieves the index pattern from an ES|QL query using AST parsing.
 * Handles both main queries and subqueries within FROM/TS commands.
 *
 * @param esql - The ES|QL query string to parse
 * @returns Comma-separated string of unique index names, or empty string if no sources found
 */
export declare function getIndexPatternFromESQLQuery(esql?: string): string;
/** Splits a comma-separated ES|QL index pattern into source names. */
export declare function splitIndexPatternSources(indexPattern: string): string[];
/**
 * @param esql - The ES|QL query string to parse
 * @param supportedSourceCommands - Source command set to match, defaults to FROM and TS
 * @returns The source command name, or an empty string if not found
 */
export declare function getSourceCommandFromESQLQuery(esql: string | undefined, supportedSourceCommands?: Set<string>): string;
/**
 * Returns the FROM or TS command alone (with METADATA, and each subquery reduced to its source
 * command), whose columns are the schema of the queried dataset; for PROMQL, `FROM <index>` of
 * its index parameter. `SET project_routing` is left out, so the text matches the ES|QL editor's
 * fields query; pass the routing separately. Empty string if there is no such command.
 */
export declare function getSourceCommandQueryFromESQLQuery(esql: string | undefined): string;
/**
 * Retrieves the source command name from an ES|QL query,
 * matching any source command (FROM, TS, PROMQL, etc.)
 * @param esql - The ES|QL query string to parse
 * @returns The source command name, or an empty string if not found
 */
export declare function getAnySourceCommandFromESQLQuery(esql?: string): string;
