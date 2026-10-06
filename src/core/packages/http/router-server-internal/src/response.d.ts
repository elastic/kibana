import type { IKibanaResponse, HttpResponsePayload, ResponseError, HttpResponseOptions, FileHttpResponseOptions, KibanaResponseFactory, LifecycleResponseFactory } from '@kbn/core-http-server';
/**
 * A response data object, expected to returned as a result of {@link RequestHandler} execution
 * @internal
 */
export declare class KibanaResponse<T extends HttpResponsePayload | ResponseError = any> implements IKibanaResponse<T> {
    readonly status: number;
    readonly payload?: T | undefined;
    readonly options: HttpResponseOptions;
    constructor(status: number, payload?: T | undefined, options?: HttpResponseOptions);
}
export declare const fileResponseFactory: {
    file: <T extends HttpResponsePayload | ResponseError>(options: FileHttpResponseOptions<T>) => KibanaResponse<Buffer<ArrayBuffer> | NonNullable<T>>;
};
export declare const kibanaResponseFactory: KibanaResponseFactory;
export declare const lifecycleResponseFactory: LifecycleResponseFactory;
