import type { HttpStart } from '@kbn/core/public';
import type { IndicesAutocompleteResult } from '@kbn/esql-types';
/**
 * Fetches join indices based on the provided ESQL query.
 * @param query The ESQL query string to extract remote clusters from.
 * @param http The HTTP service to use for the request.
 * @param cacheOptions Optional cache options to control cache behavior.
 * @returns A promise that resolves to an IndicesAutocompleteResult object.
 */
export declare const getJoinIndices: (query: string, http: HttpStart, cacheOptions?: {
    forceRefresh?: boolean;
}) => Promise<IndicesAutocompleteResult>;
