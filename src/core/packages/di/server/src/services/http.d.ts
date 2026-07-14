import type { Newable, ServiceIdentifier } from 'inversify';
import type { IRouter, KibanaRequest, KibanaResponseFactory, RequestHandler, RouteConfig, RouteMethod } from '@kbn/core-http-server';
/**
 * The route definition.
 * @public
 */
export interface RouteDefinition<P = unknown, Q = unknown, B = unknown, Method extends Exclude<RouteMethod, 'options'> = Exclude<RouteMethod, 'options'>> extends RouteConfig<P, Q, B, Method>, Newable<RouteHandler> {
    /**
     * The HTTP method of the route.
     */
    method: Method;
    /**
     * Catch and convert legacy boom errors to proper custom errors.
     * @see {@link IRouter.handleLegacyErrors}
     */
    handleLegacyErrors?: boolean;
}
/**
 * The route handler.
 * @public
 */
export interface RouteHandler {
    /**
     * The handler function that will be called when the route is matched.
     * The request and response objects can be injected using {@link Request} and {@link Response}.
     */
    handle(): ReturnType<RequestHandler>;
}
/**
 * The service identifier that is used to register an HTTP route.
 * @public
 */
export declare const Route: ServiceIdentifier<ServiceIdentifier<RouteHandler> & RouteDefinition>;
/**
 * The service identifier of the plugin-scoped router.
 * @public
 */
export declare const Router: ServiceIdentifier<IRouter<any>>;
/**
 * The service identifier of the current request.
 * @public
 */
export declare const Request: ServiceIdentifier<KibanaRequest>;
/**
 * The service identifier of the current response factory.
 * @public
 */
export declare const Response: ServiceIdentifier<KibanaResponseFactory>;
