import type { EsqlViewsResult } from '@kbn/esql-types';
/**
 * Fetches all ES|QL views from the cluster (GET _query/view).
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the views list.
 */
export declare const getViews: (this: void | {
    forceRefresh?: boolean;
} | undefined, http: import("@kbn/core/public").HttpSetup) => Promise<EsqlViewsResult>;
