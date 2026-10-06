import type { HttpStart } from '@kbn/core/public';
/**
 * Resolves the time field for an ES|QL query by calling the server-side timefield API.
 * The API performs a local parse for `?_tstart`/`?_tend` params first, then falls back
 * to `fieldCaps` to detect `@timestamp` on the backing index.
 *
 * Use this on the client when you have HTTP access and need full resolution.
 * For synchronous/server-side contexts where only local parsing is needed,
 * use `parseTimeFieldFromESQLQuery` instead.
 *
 * Concurrent requests for the same query and routing share one HTTP request via an
 * LRU-backed promise cache.
 *
 * @param projectRouting - The effective project routing to forward to the server. Callers
 * should resolve precedence (SET instruction vs picker) before passing this value.
 */
export declare function getESQLTimeField({ query, http, projectRouting, }: {
    query: string;
    http?: HttpStart;
    projectRouting?: string;
}): Promise<string | undefined>;
