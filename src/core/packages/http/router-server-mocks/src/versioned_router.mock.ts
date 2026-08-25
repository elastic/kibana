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
  AddVersionOpts,
  RequestHandler,
  KibanaResponseFactory,
  VersionedRouterRoute,
} from '@kbn/core-http-server';

export type MockedVersionedRoute = jest.Mocked<VersionedRoute>;

const createMockVersionedRoute = (): MockedVersionedRoute => {
  const addVersion = jest.fn((_, __) => api);
  const api: MockedVersionedRoute = { addVersion };
  return api;
};

type VersionedRouterMethods = keyof Omit<VersionedRouter, 'getRoutes'>;

export type MockedVersionedRouter = jest.Mocked<VersionedRouter<any>> & {
  getRoute: (method: VersionedRouterMethods, path: string) => RegisteredVersionedRoute;
};

const createMethodHandler = () => jest.fn((_) => createMockVersionedRoute());
const createMockGetRoutes = () => jest.fn(() => [] as VersionedRouterRoute[]);
export const createVersionedRouterMock = (): MockedVersionedRouter => {
  const router: Omit<MockedVersionedRouter, 'getRoute' | 'getRoutes'> = {
    delete: createMethodHandler(),
    get: createMethodHandler(),
    patch: createMethodHandler(),
    post: createMethodHandler(),
    put: createMethodHandler(),
  };

  return {
    ...router,
    getRoute: getRoute.bind(null, router),
    getRoutes: createMockGetRoutes(),
  };
};

export interface RegisteredVersionedRoute {
  config: VersionedRouteConfig<any>;
  versions: {
    [version: string]: {
      config: AddVersionOpts<any, any, any>;
      handler: RequestHandler<any, any, any, any, any, KibanaResponseFactory>;
    };
  };
}

const getRoute = (
  router: Omit<MockedVersionedRouter, 'getRoute' | 'getRoutes'>,
  method: VersionedRouterMethods,
  path: string
): RegisteredVersionedRoute => {
  if (!router[method].mock.calls.length) {
    throw new Error(`No routes registered for [${method.toUpperCase()} ${path}]`);
  }

  let route: undefined | RegisteredVersionedRoute;
  for (let x = 0; x < router[method].mock.calls.length; x++) {
    const [routeConfig] = router[method].mock.calls[x];
    if (routeConfig.path === path) {
      const mockedAddVersion = router[method].mock.results[x].value as MockedVersionedRoute;
      route = {
        config: routeConfig,
        versions: mockedAddVersion.addVersion.mock.calls.reduce(
          (acc, [config, handler]) => ({
            ...acc,
            [config.version]: { config, handler },
          }),
          {}
        ),
      };
      break;
    }
  }

  if (!route) {
    throw new Error(`No routes registered for [${method.toUpperCase()} ${path}]`);
  }

  return route;
};
