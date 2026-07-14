import type { Request } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest, RouteConfig, RouteMethod, RequestHandlerContextBase, RouterRoute, IRouter, RequestHandler, VersionedRouter, RouteRegistrar, PostValidationMetadata, IKibanaResponse } from '@kbn/core-http-server';
import type { RouteSecurityGetter } from '@kbn/core-http-server';
import type { Env } from '@kbn/config';
import type { CoreKibanaRequest } from './request';
export type ContextEnhancer<P, Q, B, Method extends RouteMethod, Context extends RequestHandlerContextBase> = (handler: RequestHandler<P, Q, B, Context, Method>) => RequestHandlerEnhanced<P, Q, B, Method>;
/** @internal */
export type InternalRouteHandler = (request: Request) => Promise<IKibanaResponse>;
/**
 * We have at least two implementations of InternalRouterRoutes:
 * (1) Router route
 * (2) Versioned router route {@link CoreVersionedRoute}
 *
 * The former registers internal handlers when users call `route.put(...)` while
 * the latter registers an internal handler for `router.versioned.put(...)`.
 *
 * This enables us to expose internal details to each of these types routes so
 * that implementation has freedom to change what it needs to in each case, like:
 *
 * validation: versioned routes only know what validation to run after inspecting
 * special version values, whereas "regular" routes only ever have one validation
 * that is predetermined to always run.
 * @internal
 */
export type InternalRouterRoute = Omit<RouterRoute, 'handler'> & {
    handler: InternalRouteHandler;
};
/** @internal */
export interface RouterOptions {
    env: Env;
    /** Plugin for which this router was registered */
    pluginId?: symbol;
    versionedRouterOptions?: {
        /** {@inheritdoc VersionedRouterArgs['defaultHandlerResolutionStrategy'] }*/
        defaultHandlerResolutionStrategy?: 'newest' | 'oldest' | 'none';
        /** {@inheritdoc VersionedRouterArgs['useVersionResolutionStrategyForInternalPaths'] }*/
        useVersionResolutionStrategyForInternalPaths?: string[];
    };
}
/** @internal */
export type VersionedRouteConfig<P, Q, B, M extends RouteMethod> = Omit<RouteConfig<P, Q, B, M>, 'security'> & {
    security?: RouteSecurityGetter;
};
/** @internal */
type RouterEvents = 
/** Called after route validation, regardless of success or failure */
'onPostValidate';
/**
 * @internal
 */
export declare class Router<Context extends RequestHandlerContextBase = RequestHandlerContextBase> implements IRouter<Context> {
    readonly routerPath: string;
    private readonly log;
    readonly enhanceWithContext: ContextEnhancer<any, any, any, any, any>;
    private readonly options;
    /**
     * Used for global request events at the router level, similar to what we get from Hapi's request lifecycle events.
     *
     * See {@link RouterEvents}.
     */
    private static events;
    routes: Array<Readonly<RouterRoute>>;
    pluginId?: symbol;
    get: RouteRegistrar<'get', Context>;
    post: RouteRegistrar<'post', Context>;
    delete: RouteRegistrar<'delete', Context>;
    put: RouteRegistrar<'put', Context>;
    patch: RouteRegistrar<'patch', Context>;
    constructor(routerPath: string, log: Logger, enhanceWithContext: ContextEnhancer<any, any, any, any, any>, options: RouterOptions);
    static on(event: RouterEvents, cb: (req: CoreKibanaRequest, ...args: any[]) => void): void;
    static off(event: RouterEvents, cb: (req: CoreKibanaRequest, ...args: any[]) => void): void;
    getRoutes({ excludeVersionedRoutes }?: {
        excludeVersionedRoutes?: boolean;
    }): Readonly<RouterRoute>[];
    handleLegacyErrors: import("@kbn/core-http-server").RequestHandlerWrapper;
    emitPostValidate: (request: KibanaRequest, postValidateConext?: PostValidationMetadata) => void;
    /** @internal */
    registerRoute(route: InternalRouterRoute): void;
    private handle;
    private versionedRouter;
    get versioned(): VersionedRouter<Context>;
}
type WithoutHeadArgument<T> = T extends (first: any, ...rest: infer Params) => infer Return ? (...rest: Params) => Return : never;
export type RequestHandlerEnhanced<P, Q, B, Method extends RouteMethod> = WithoutHeadArgument<RequestHandler<P, Q, B, RequestHandlerContextBase, Method>>;
export {};
