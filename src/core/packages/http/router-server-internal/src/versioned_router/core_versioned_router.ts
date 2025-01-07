/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  VersionedRouter,
  VersionedRoute,
  VersionedRouteConfig,
  VersionedRouterRoute,
} from '@kbn/core-http-server';
import { omit } from 'lodash';
import { CoreVersionedRoute } from './core_versioned_route';
import type { HandlerResolutionStrategy, Method } from './types';
import { getRouteFullPath, type Router } from '../router';

/** @internal */
export interface VersionedRouterArgs {
  router: Router;
  /**
   * Which route resolution algo to use.
   * @note default to "oldest", but when running in dev default to "none"
   */
  defaultHandlerResolutionStrategy?: HandlerResolutionStrategy;
  /** Whether Kibana is running in a dev environment */
  isDev?: boolean;
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

export class CoreVersionedRouter implements VersionedRouter {
  private readonly routes = new Set<CoreVersionedRoute>();
  public readonly useVersionResolutionStrategyForInternalPaths: Map<string, boolean> = new Map();
  public pluginId?: symbol;
  public static from({
    router,
    defaultHandlerResolutionStrategy,
    isDev,
    useVersionResolutionStrategyForInternalPaths,
  }: VersionedRouterArgs) {
    return new CoreVersionedRouter(
      router,
      defaultHandlerResolutionStrategy,
      isDev,
      useVersionResolutionStrategyForInternalPaths
    );
  }
  private constructor(
    public readonly router: Router,
    public readonly defaultHandlerResolutionStrategy: HandlerResolutionStrategy = 'oldest',
    public readonly isDev: boolean = false,
    useVersionResolutionStrategyForInternalPaths: string[] = []
  ) {
    this.pluginId = this.router.pluginId;
    for (const path of useVersionResolutionStrategyForInternalPaths) {
      this.useVersionResolutionStrategyForInternalPaths.set(path, true);
    }
  }

  private registerVersionedRoute =
    (routeMethod: Method) =>
    (options: VersionedRouteConfig<Method>): VersionedRoute<Method, any> => {
      const route = CoreVersionedRoute.from({
        router: this.router,
        method: routeMethod,
        path: options.path,
        options: {
          ...options,
          defaultHandlerResolutionStrategy: this.defaultHandlerResolutionStrategy,
          useVersionResolutionStrategyForInternalPaths:
            this.useVersionResolutionStrategyForInternalPaths,
          isDev: this.isDev,
        },
      });
      this.routes.add(route);
      return route;
    };

  public get = this.registerVersionedRoute('get');
  public delete = this.registerVersionedRoute('delete');
  public post = this.registerVersionedRoute('post');
  public patch = this.registerVersionedRoute('patch');
  public put = this.registerVersionedRoute('put');

  public getRoutes(): VersionedRouterRoute[] {
    return [...this.routes].map((route) => {
      return {
        path: getRouteFullPath(this.router.routerPath, route.path),
        method: route.method,
        options: omit(route.options, 'path'),
        handlers: route.getHandlers(),
        isVersioned: true,
      };
    });
  }
}
