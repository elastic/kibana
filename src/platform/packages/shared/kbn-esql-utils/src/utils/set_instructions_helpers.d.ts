/**
 * Extracts the project routing value from an ES|QL query string.
 *
 * @param queryString - The ES|QL query string to parse
 * @returns The project routing value if found, undefined otherwise
 *
 * @example
 * getProjectRoutingFromEsqlQuery('SET project_routing = "_alias:*"; FROM my_index')
 * // Returns: '_alias:*'
 *
 * getProjectRoutingFromEsqlQuery('FROM my_index')
 * // Returns: undefined
 */
export declare function getProjectRoutingFromEsqlQuery(queryString: string): string | undefined;
