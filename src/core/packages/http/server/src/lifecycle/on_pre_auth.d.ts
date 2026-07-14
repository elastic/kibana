import type { IKibanaResponse, KibanaRequest, LifecycleResponseFactory } from '../router';
/**
 * @public
 */
export declare enum OnPreAuthResultType {
    next = "next"
}
/**
 * @public
 */
export interface OnPreAuthNextResult {
    type: OnPreAuthResultType.next;
}
/**
 * @public
 */
export type OnPreAuthResult = OnPreAuthNextResult;
/**
 * @public
 * A tool set defining an outcome of OnPreAuth interceptor for incoming request.
 */
export interface OnPreAuthToolkit {
    /** To pass request to the next handler */
    next: () => OnPreAuthResult;
}
/**
 * See {@link OnPreAuthToolkit}.
 * @public
 */
export type OnPreAuthHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: OnPreAuthToolkit) => OnPreAuthResult | IKibanaResponse | Promise<OnPreAuthResult | IKibanaResponse>;
