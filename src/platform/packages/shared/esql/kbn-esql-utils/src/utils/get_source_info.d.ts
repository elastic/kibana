import type { HttpStart } from '@kbn/core/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
export interface ESQLSourceInfoColumn {
    name: string;
    esType: string;
    originalTypes?: string[];
    columnMeta?: Record<string, unknown>;
}
export interface ESQLSourceInfo {
    columns: ESQLSourceInfoColumn[];
    /** Set when the query failed (e.g. invalid or partial query); the request is not cached. */
    error?: {
        statusCode: number;
        message: string;
    };
}
/** How long a source's schema is cached, like the ES|QL editor's fields cache: new fields show up without a reload. */
export declare const ESQL_SOURCE_INFO_CACHE_TTL: number;
/**
 * Strips the client-only `meta` field from ES|QL control variables and returns
 * a stable JSON cache key for `(query, projectRouting, variables)`.
 * `meta` must never reach the server and must not influence cache behaviour.
 */
export declare function buildEsqlSourceCacheKey(query: string, projectRouting: string | undefined, esqlVariables: ESQLControlVariable[] | undefined): {
    cacheKey: string;
    cleanVariables: ESQLControlVariable[] | undefined;
};
export declare function clearESQLSourceInfoCache(): void;
export declare function getESQLSourceInfo({ query, http, projectRouting, timeRange, timeFieldName, esqlVariables, signal, }: {
    query: string;
    http: HttpStart;
    projectRouting?: string;
    timeRange?: {
        from: string;
        to: string;
    };
    timeFieldName?: string;
    esqlVariables?: ESQLControlVariable[];
    /** Stops waiting; the request itself is aborted once all callers sharing it have aborted. */
    signal?: AbortSignal;
}): Promise<ESQLSourceInfo>;
