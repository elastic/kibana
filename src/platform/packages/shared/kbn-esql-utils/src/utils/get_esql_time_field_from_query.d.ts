import type { HttpStart } from '@kbn/core/public';
/**
 * Resolves the default time field for an ES|QL query by calling the timefield API.
 *
 * When `http` is omitted, returns `undefined` (unless a prior successful request
 * for the same query left a value in the in-memory cache).
 *
 * Concurrent requests for the same query share one HTTP request via an LRU-backed promise cache.
 */
export declare function getESQLTimeFieldFromQuery({ query, http, }: {
    query: string;
    http?: HttpStart;
}): Promise<string | undefined>;
