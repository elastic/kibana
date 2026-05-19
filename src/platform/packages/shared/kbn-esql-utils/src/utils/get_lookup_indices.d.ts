/**
 * Extracts and returns a list of unique lookup indices from the provided ESQL query by parsing the query and traversing its AST.
 *
 * @param {string} esqlQuery - The ESQL query string to parse and analyze for lookup indices.
 * @return {string[]} An array of unique lookup index names found in the query.
 */
export declare function getLookupIndicesFromQuery(esqlQuery: string): string[];
