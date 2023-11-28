/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core-http-server';
import type { VersionedRouter, VersionedRoute, VersionedRouteConfig } from '@kbn/core-http-server';
import { CoreVersionedRoute } from './core_versioned_route';
import type { HandlerResolutionStrategy, Method, VersionedRouterRoute } from './types';

/** @internal */
interface Dependencies {
  router: IRouter;
  defaultHandlerResolutionStrategy?: HandlerResolutionStrategy;
  /** Whether Kibana is running in a dev environment */
  isDev?: boolean;
}

export class CoreVersionedRouter implements VersionedRouter {
  private readonly routes = new Set<CoreVersionedRoute>();
  public static from({ router, defaultHandlerResolutionStrategy, isDev }: Dependencies) {
    return new CoreVersionedRouter(router, defaultHandlerResolutionStrategy, isDev);
  }
  private constructor(
    public readonly router: IRouter,
    public readonly defaultHandlerResolutionStrategy: HandlerResolutionStrategy = 'oldest',
    public readonly isDev: boolean = false
  ) {}

  private registerVersionedRoute =
    (routeMethod: Method) =>
    (options: VersionedRouteConfig<Method>): VersionedRoute<Method, any> => {
      const route = CoreVersionedRoute.from({
        router: this,
        method: routeMethod,
        path: options.path,
        options,
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
        path: route.path,
        method: route.method,
        options: route.options,
        handlers: route.getHandlers(),
      };
    });
  }
}
