import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
export interface ValidHit<TSource> {
    _id: string;
    _source: TSource;
    sort?: estypes.SortResults;
}
/** Minimal search response shape — only the fields used by the paginator. */
interface SearchResponseLike<TSource> {
    hits: {
        hits: Array<{
            _id?: string | null;
            _source?: TSource | null;
            sort?: estypes.SortResults;
        }>;
    };
}
export interface PaginateWithSearchAfterOptions<TSource> {
    /** Executes the search for each page. Receives `searchAfter` for subsequent pages. */
    search: (searchAfter: estypes.SortResults | undefined) => Promise<SearchResponseLike<TSource>>;
    pageSize: number;
    maxPages?: number;
    logger: Logger;
    /** Identifies the operation in truncation warnings (e.g. "disableAllWorkflows"). */
    operationName: string;
    /** When true, throws if a hit is missing its sort value. When false (default), breaks the loop. */
    throwOnMissingSort?: boolean;
}
export interface PaginateResult {
    totalProcessed: number;
    truncated: boolean;
}
/**
 * Paginates through ES results using `search_after`.
 * Calls `onPage` for each batch of valid hits (non-null `_id` and `_source`).
 * Handles the page loop, hasMore check, search_after extraction, and MAX_PAGES truncation.
 */
export declare const paginateWithSearchAfter: <TSource>(options: PaginateWithSearchAfterOptions<TSource>, onPage: (hits: Array<ValidHit<TSource>>) => Promise<void>) => Promise<PaginateResult>;
export {};
