import type { HttpStart } from '@kbn/core/public';
import { type IndicesAutocompleteResult } from '@kbn/esql-types';
/**
 * Fetches join indices based on the provided ESQL query.
 * Caching is handled at the call site (React-level useMemo) so that
 * projectRouting changes automatically invalidate the cache.
 */
export declare const getJoinIndices: (query: string, http: HttpStart, projectRouting?: string, signal?: AbortSignal) => Promise<IndicesAutocompleteResult>;
