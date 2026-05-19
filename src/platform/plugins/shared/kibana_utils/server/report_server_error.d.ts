import type { KibanaResponseFactory } from '@kbn/core/server';
import { KbnError } from '../common';
export declare class KbnServerError extends KbnError {
    readonly statusCode: number;
    errBody?: Record<string, any>;
    constructor(message: string, statusCode: number, errBody?: Record<string, any>);
}
/**
 * Formats any error thrown into a standardized `KbnServerError`.
 * @param e `Error` or `ElasticsearchClientError`
 * @returns `KbnServerError`
 */
export declare function getKbnServerError(e: Error): KbnServerError;
/**
 *
 * @param res Formats a `KbnServerError` into a server error response
 * @param err
 */
export declare function reportServerError(res: KibanaResponseFactory, err: KbnServerError): import("@kbn/core/server").IKibanaResponse<any>;
