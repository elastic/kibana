/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import {
  type IRouteHandler,
  RequestToken,
  ResponseToken,
  Route,
  type RouteRegistrar,
  RouterService,
} from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { DiService, Global, OnSetup } from '@kbn/core-di';

export const httpModule = new ContainerModule(
  (bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
    onActivation(Route, ({ container }, route) => {
      const router = container.get(RouterService);
      const register = router[route.method] as RouteRegistrar<
        typeof route.method,
        RequestHandlerContext
      >;

      register(route, async (_context, request, response) => {
        const scope = container.get(DiService).fork();

        scope.bind(RequestToken).toConstantValue(request);
        scope.bind(ResponseToken).toConstantValue(response);
        scope.bind(Global).toConstantValue(RequestToken);
        scope.bind(Global).toConstantValue(ResponseToken);

        try {
          return await scope.get<IRouteHandler>(route).handle();
        } finally {
          scope.unbindAll();
        }
      });

      return route;
    });

    bind(OnSetup).toConstantValue((container) => {
      if (container.isCurrentBound(Route)) {
        container.getAll(Route);
      }
    });
  }
);
