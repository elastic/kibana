import type { RecommendedField, RecommendedQuery, ESQLRegistrySolutionId } from '@kbn/esql-types';
import type { HttpStart } from '@kbn/core/public';
interface EditorExtensions {
    recommendedQueries: RecommendedQuery[];
    recommendedFields: RecommendedField[];
}
/**
 * Single-pass analysis of the query string: parses the AST once and returns
 * whether the source is complete, the index pattern, and the command name.
 * Returns undefined when the source is incomplete or missing.
 */
export declare const analyzeSourceQuery: (queryString: string) => {
    indexPattern: string;
    commandName: string;
} | undefined;
/**
 * Fetches editor extensions from the registry based on the provided query string and active solution ID.
 * @param queryString The query string to search for extensions.
 * @param activeSolutionId The active solution ID to filter extensions.
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the editor extensions.
 * Results are cached by index pattern so they are computed once per source and reused
 * across all consumers. While the user is still typing the source name the function
 * returns an empty result immediately without making any HTTP requests.
 */
export declare const getEditorExtensions: (http: HttpStart, queryString: string, activeSolutionId: ESQLRegistrySolutionId) => Promise<EditorExtensions>;
export {};
