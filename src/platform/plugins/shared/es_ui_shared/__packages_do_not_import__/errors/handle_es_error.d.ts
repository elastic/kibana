import type { errors } from '@elastic/elasticsearch';
import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
interface EsErrorHandlerParams {
    error: errors.ElasticsearchClientError;
    response: KibanaResponseFactory;
    handleCustomError?: () => IKibanaResponse<any>;
}
/**
 * For errors returned by the new elasticsearch js client.
 *
 * @throws If "error" is not an error from the elasticsearch client this handler will throw "error".
 */
export declare const handleEsError: ({ error, response, handleCustomError, }: EsErrorHandlerParams) => IKibanaResponse;
export {};
