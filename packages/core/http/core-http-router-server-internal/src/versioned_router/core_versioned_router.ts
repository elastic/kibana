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
import { Method, VersionedRouterRoute } from './types';

export class CoreVersionedRouter implements VersionedRouter {
  private readonly routes = new Set<CoreVersionedRoute>();
  public static from({
    router,
    validateResponses,
  }: {
    router: IRouter;
    validateResponses?: boolean;
  }) {
    return new CoreVersionedRouter(router, validateResponses);
  }
  private constructor(
    private readonly router: IRouter,
    private readonly validateResponses: boolean = false
  ) {}

  private registerVersionedRoute =
    (routeMethod: Method) =>
    (options: VersionedRouteConfig<Method>): VersionedRoute<Method, any> => {
      const route = CoreVersionedRoute.from({
        router: this.router,
        method: routeMethod,
        path: options.path,
        options,
        validateResponses: this.validateResponses,
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
