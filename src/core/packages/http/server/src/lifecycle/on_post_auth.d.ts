import type { IKibanaResponse, KibanaRequest, LifecycleResponseFactory } from '../router';
/**
 * @public
 */
export declare enum OnPostAuthResultType {
    next = "next",
    authzResult = "authzResult"
}
/**
 * @public
 */
export interface OnPostAuthNextResult {
    type: OnPostAuthResultType.next;
}
/**
 * @public
 */
export interface OnPostAuthAuthzResult {
    type: OnPostAuthResultType.authzResult;
    authzResult: Record<string, boolean>;
}
/**
 * @public
 */
export type OnPostAuthResult = OnPostAuthNextResult | OnPostAuthAuthzResult;
/**
 * @public
 * A tool set defining an outcome of OnPostAuth interceptor for incoming request.
 */
export interface OnPostAuthToolkit {
    /** To pass request to the next handler */
    next: () => OnPostAuthResult;
    authzResultNext: (authzResult: Record<string, boolean>) => OnPostAuthAuthzResult;
}
/**
 * See {@link OnPostAuthToolkit}.
 * @public
 */
export type OnPostAuthHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: OnPostAuthToolkit) => OnPostAuthResult | IKibanaResponse | Promise<OnPostAuthResult | IKibanaResponse>;
