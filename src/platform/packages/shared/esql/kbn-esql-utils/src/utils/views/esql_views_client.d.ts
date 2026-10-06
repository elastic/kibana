import type { EsqlDeleteViewResponse, EsqlPutViewResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart } from '@kbn/core/public';
import { type EsqlView, type EsqlViewsResult } from '@kbn/esql-types';
export declare const ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE = "esql_view_already_exists_exception";
export declare class EsqlViewsClientError extends Error {
    readonly statusCode?: number | undefined;
    readonly originalError?: Error | undefined;
    readonly errorType?: string | undefined;
    constructor(message: string, statusCode?: number | undefined, originalError?: Error | undefined, errorType?: string | undefined);
}
export interface UpsertEsqlViewRequest {
    name: string;
    query: string;
    description?: string;
}
export interface EsqlViewsClient {
    getViews(signal?: AbortSignal): Promise<EsqlViewsResult>;
    getView(name: string, signal?: AbortSignal): Promise<EsqlView | undefined>;
    createView(request: UpsertEsqlViewRequest): Promise<EsqlPutViewResponse>;
    updateView(request: UpsertEsqlViewRequest): Promise<EsqlPutViewResponse>;
    deleteViews(names: string[]): Promise<EsqlDeleteViewResponse>;
}
export declare const createEsqlViewsManagementClient: (http: HttpStart) => EsqlViewsClient;
