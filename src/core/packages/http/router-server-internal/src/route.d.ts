import { type RouteMethod, type SafeRouteMethod, type RouteConfig } from '@kbn/core-http-server';
import type { RouteSecurityGetter, RouteSecurity, AnyKibanaRequest, IKibanaResponse, RouteConfigOptions } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { Request } from '@hapi/hapi';
import type { InternalRouterRoute, RequestHandlerEnhanced, Router } from './router';
import { RouteValidator } from './validator';
export declare function isSafeMethod(method: RouteMethod): method is SafeRouteMethod;
/** @interval */
export type InternalRouteConfig<P, Q, B, M extends RouteMethod> = Omit<RouteConfig<P, Q, B, M>, 'security'> & {
    security?: RouteSecurityGetter | RouteSecurity;
};
/** @internal */
interface Dependencies {
    router: Router;
    route: InternalRouteConfig<unknown, unknown, unknown, RouteMethod>;
    handler: RequestHandlerEnhanced<unknown, unknown, unknown, RouteMethod>;
    log: Logger;
    method: RouteMethod;
}
export declare function buildRoute({ handler, log, route, router, method, }: Dependencies): InternalRouterRoute;
/** @internal */
interface HandlerDependencies extends Dependencies {
    routeSchemas?: RouteValidator<unknown, unknown, unknown>;
}
type RouteInfo = Pick<RouteConfigOptions<RouteMethod>, 'access' | 'httpResource' | 'deprecated'>;
interface ValidationContext {
    routeInfo: RouteInfo;
    router: Router;
    log: Logger;
    routeSchemas?: RouteValidator<unknown, unknown, unknown>;
    version?: string;
}
/** @internal */
export declare function validateHapiRequest(request: Request, { routeInfo, router, log, routeSchemas, version }: ValidationContext): {
    ok: AnyKibanaRequest;
    error?: never;
} | {
    ok?: never;
    error: IKibanaResponse;
};
/** @internal */
export declare const handle: (request: Request, { router, route, handler, routeSchemas, log }: HandlerDependencies) => Promise<IKibanaResponse<any>>;
export {};
