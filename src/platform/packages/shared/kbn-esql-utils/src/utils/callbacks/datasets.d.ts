import type { EsqlDatasetsResult } from '@kbn/esql-types';
/**
 * Fetches all ES|QL datasets from the cluster (GET _query/dataset).
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the datasets list.
 */
export declare const getDatasets: (this: void | {
    forceRefresh?: boolean;
} | undefined, http: import("@kbn/core/public").HttpSetup) => Promise<EsqlDatasetsResult>;
