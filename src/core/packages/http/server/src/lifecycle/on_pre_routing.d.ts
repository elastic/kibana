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
 *
 * @deprecated See {@link HttpServiceSetup.registerOnPreRouting}.
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
 *
 * @deprecated No remaining consumers in Kibana plugins. See
 * {@link HttpServiceSetup.registerOnPreRouting} for the full deprecation note.
 */
export type OnPreRoutingHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: OnPreRoutingToolkit) => OnPreRoutingResult | IKibanaResponse | Promise<OnPreRoutingResult | IKibanaResponse>;
