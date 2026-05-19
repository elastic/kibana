import type { IKibanaResponse, KibanaRequest, LifecycleResponseFactory } from '../router';
export declare enum OnPreRoutingResultType {
    next = "next",
    rewriteUrl = "rewriteUrl"
}
export interface OnPreRoutingResultNext {
    type: OnPreRoutingResultType.next;
}
export interface OnPreRoutingResultRewriteUrl {
    type: OnPreRoutingResultType.rewriteUrl;
    url: string;
}
export type OnPreRoutingResult = OnPreRoutingResultNext | OnPreRoutingResultRewriteUrl;
/**
 * @public
 * A tool set defining an outcome of OnPreRouting interceptor for incoming request.
 */
export interface OnPreRoutingToolkit {
    /** To pass request to the next handler */
    next: () => OnPreRoutingResult;
    /** Rewrite requested resources url before is was authenticated and routed to a handler */
    rewriteUrl: (url: string) => OnPreRoutingResult;
}
/**
 * See {@link OnPreRoutingToolkit}.
 * @public
 */
export type OnPreRoutingHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: OnPreRoutingToolkit) => OnPreRoutingResult | IKibanaResponse | Promise<OnPreRoutingResult | IKibanaResponse>;
