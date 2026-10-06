import type { HttpStart } from '@kbn/core/public';
import { type IndicesAutocompleteResult } from '@kbn/esql-types';
/**
 * Fetches time series indices from the server.
 * Caching is handled at the call site (React-level useMemo) so that
 * projectRouting changes automatically invalidate the cache.
 */
export declare const getTimeseriesIndices: (http: HttpStart, projectRouting?: string, signal?: AbortSignal) => Promise<IndicesAutocompleteResult>;
