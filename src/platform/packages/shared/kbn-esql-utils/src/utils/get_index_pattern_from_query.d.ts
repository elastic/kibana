/**
 * Retrieves the index pattern from an ES|QL query using AST parsing.
 * Handles both main queries and subqueries within FROM/TS commands.
 *
 * @param esql - The ES|QL query string to parse
 * @returns Comma-separated string of unique index names, or empty string if no sources found
 */
export declare function getIndexPatternFromESQLQuery(esql?: string): string;
/**
 * @param esql - The ES|QL query string to parse
 * @returns The source command name, or an empty string if not found
 */
export declare function getSourceCommandFromESQLQuery(esql?: string): string;
