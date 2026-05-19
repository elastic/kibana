import type { RecommendedQuery } from '@kbn/esql-types';
import type { ISuggestionItem } from '../../commands/registry/types';
/**
 * This function maps the recommended queries from the extensions to the autocomplete suggestions.
 * @param recommendedQueriesExtensions, the recommended queries extensions to map
 * @returns ISuggestionItem[], the mapped suggestions
 */
export declare const mapRecommendedQueriesFromExtensions: (recommendedQueriesExtensions: RecommendedQuery[]) => ISuggestionItem[];
