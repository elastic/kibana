import type { VersionedRouter, VersionedRoute, VersionedRouteConfig, VersionedRouterRoute } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { Env } from '@kbn/config';
import type { HandlerResolutionStrategy, Method } from './types';
import type { Router } from '../router';
/** @internal */
export interface VersionedRouterArgs {
    router: Router;
    log: Logger;
    /**
     * Which route resolution algo to use.
     * @note default to "oldest", but when running in dev default to "none"
     */
    defaultHandlerResolutionStrategy?: HandlerResolutionStrategy;
    /** Whether Kibana is running in a dev environment */
    env: Env;
    /**
     * List of internal paths that should use the default handler resolution strategy. By default this
     * is no routes ([]) because ONLY Elastic clients are intended to call internal routes.
     *
     * @note Relaxing this requirement for a path may lead to unspecified behavior because internal
     * routes, do not use this unless needed!
     *
     * @note This is intended as a workaround. For example: users who have in
     * error come to rely on internal functionality and cannot easily pass a version
     * and need a workaround.
     *
     * @note Exact matches are performed against the paths as registered against the router
     *
     * @default []
     */
    useVersionResolutionStrategyForInternalPaths?: string[];
}
export declare class CoreVersionedRouter implements VersionedRouter {
    readonly router: Router;
    private readonly log;
    readonly defaultHandlerResolutionStrategy: HandlerResolutionStrategy;
    readonly env: Env;
    private readonly routes;
    readonly useVersionResolutionStrategyForInternalPaths: Map<string, boolean>;
    pluginId?: symbol;
    static from({ router, log, defaultHandlerResolutionStrategy, env, useVersionResolutionStrategyForInternalPaths, }: VersionedRouterArgs): CoreVersionedRouter;
    private constructor();
    private registerVersionedRoute;
    get: (options: VersionedRouteConfig<Method>) => VersionedRoute<Method, any>;
    delete: (options: VersionedRouteConfig<Method>) => VersionedRoute<Method, any>;
    post: (options: VersionedRouteConfig<Method>) => VersionedRoute<Method, any>;
    patch: (options: VersionedRouteConfig<Method>) => VersionedRoute<Method, any>;
    put: (options: VersionedRouteConfig<Method>) => VersionedRoute<Method, any>;
    getRoutes(): VersionedRouterRoute[];
}
