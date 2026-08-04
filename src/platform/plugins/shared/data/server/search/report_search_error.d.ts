import type { ConnectionRequestParams } from '@elastic/transport';
import type { KibanaResponseFactory } from '@kbn/core/server';
import { KbnError } from '@kbn/kibana-utils-plugin/common';
import type { SanitizedConnectionRequestParams } from '@kbn/search-types';
export declare class KbnSearchError extends KbnError {
    readonly statusCode: number;
    errBody?: Record<string, any>;
    requestParams?: SanitizedConnectionRequestParams;
    constructor(message: string, statusCode: number, errBody?: Record<string, any>, requestParams?: ConnectionRequestParams);
}
/**
 * Formats any error thrown into a standardized `KbnSearchError`.
 * @param e `Error` or `ElasticsearchClientError`
 * @returns `KbnSearchError`
 */
export declare function getKbnSearchError(e: Error): KbnSearchError;
/**
 *
 * @param res Formats a `KbnSearchError` into a server error response
 * @param err
 */
export declare function reportSearchError(res: KibanaResponseFactory, err: KbnSearchError): import("@kbn/core/server").IKibanaResponse<any>;
