/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  ServerRouteHandlerResources,
  ServerRouteRepository,
  ServerRouteCreateOptions,
} from './typings';

export function createServerRouteRepository<
  TRouteHandlerResources extends ServerRouteHandlerResources = never,
  TRouteCreateOptions extends ServerRouteCreateOptions = never
>(): ServerRouteRepository<TRouteHandlerResources, TRouteCreateOptions, {}> {
  const routes: Record<string, any> = {};

  return {
    add(route) {
      routes[route.endpoint] = route;
      return this as any;
    },
    merge(repository) {
      Object.assign(routes, repository.getRoutes());
      return this as any;
    },
    getRoutes: () => Object.values(routes),
  };
}
