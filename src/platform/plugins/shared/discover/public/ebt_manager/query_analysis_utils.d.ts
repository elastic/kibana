import type { Request as InspectedRequest } from '@kbn/inspector-plugin/public';
/**
 * Analysis result for multi_match query types found in ES query DSL.
 * @public
 */
export interface MultiMatchAnalysis {
    /**
     * Map of normalized multi_match query types to their occurrence counts
     * e.g., Map([['match_phrase', 3], ['best_fields', 2]])
     * Note: Both multi_match with type:'phrase' and match_phrase queries
     * are normalized to 'match_phrase' for the counts
     */
    typeCounts: Map<string, number>;
    /**
     * Array of all query types found, in their original non-normalized form
     * e.g., ['phrase', 'phrase', 'match_phrase', 'best_fields']
     * This preserves the distinction between multi_match type:'phrase' and match_phrase queries
     */
    rawTypes: string[];
}
/**
 * Analyzes an Elasticsearch query DSL to extract multi_match query types
 * and count their occurrences.
 *
 * This function recursively traverses the query DSL tree to identify and count:
 * - multi_match queries with their type parameter
 * - match_phrase queries (normalized to 'match_phrase' type)
 *
 * @param query - The Elasticsearch query DSL to analyze
 * @returns MultiMatchAnalysis containing type counts
 *
 * @example
 * ```typescript
 * const query = {
 *   bool: {
 *     must: [
 *       { multi_match: { type: 'phrase', query: 'foo bar' } },
 *       { multi_match: { type: 'phrase', query: 'baz qux' } },
 *       { multi_match: { query: 'test' } } // defaults to best_fields
 *     ]
 *   }
 * };
 *
 * const result = analyzeMultiMatchTypes(query);
 * // result.typeCounts: Map([['match_phrase', 2], ['best_fields', 1]])
 * ```
 *
 * @internal
 */
export declare function analyzeMultiMatchTypesQuery(query: object | undefined): MultiMatchAnalysis;
/**
 * Analyzes an inspected request to determine the types of multi-match queries present within its body.
 *
 * @param request - The inspected request object containing the JSON body to be analyzed.
 * @returns The result of analyzing the query for multi-match types, or the result of analyzing `undefined` if the request body is invalid.
 */
export declare function analyzeMultiMatchTypesRequest(request: InspectedRequest): MultiMatchAnalysis;
/**
 * Merges multiple MultiMatchAnalysis results into a single consolidated analysis by adding up
 * the counts for each multi_match type and concatenating the raw types arrays.
 * @param analyses - Array of MultiMatchAnalysis results to merge
 * @returns A single MultiMatchAnalysis representing the merged results
 */
export declare function mergeMultiMatchAnalyses(analyses: MultiMatchAnalysis[]): MultiMatchAnalysis;
