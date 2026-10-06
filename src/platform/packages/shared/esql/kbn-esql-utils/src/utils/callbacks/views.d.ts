import type { EsqlViewsResult } from '@kbn/esql-types';
/**
 * Fetches all ES|QL views from the cluster (GET _query/view).
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the views list.
 */
export declare const getViews: (this: {
    forceRefresh?: boolean;
} | undefined | void, _http: import("@kbn/core/public").HttpSetup, _signal?: AbortSignal | undefined) => Promise<EsqlViewsResult>;
