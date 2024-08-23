/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import type { RouteRegistrar } from '@kbn/core-http-server';
import { CoreSetup, CoreStart, Request, Response, Route, Router } from '@kbn/core-di-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { Global, OnSetup } from '@kbn/core-di';

export const http = new ContainerModule(
  (bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
    onActivation(Route, ({ container }, route) => {
      const router = container.get(Router);
      const register = router[route.method] as RouteRegistrar<
        typeof route.method,
        RequestHandlerContext
      >;

      register(route, async (_context, request, response) => {
        const scope = container.get(CoreStart('injection')).fork();

        scope.bind(Request).toConstantValue(request);
        scope.bind(Response).toConstantValue(response);
        scope.bind(Global).toConstantValue(Request);
        scope.bind(Global).toConstantValue(Response);

        try {
          return await scope.get(route).handle();
        } finally {
          scope.unbindAll();
        }
      });

      return route;
    });

    bind(Router)
      .toDynamicValue(({ container }) => container.get(CoreSetup('http')).createRouter())
      .inRequestScope()
      .onActivation(({ container }, router) => {
        if (!container.isCurrentBound(Router)) {
          container.bind(Router).toConstantValue(router);
        }

        return router;
      });

    bind(OnSetup).toConstantValue((container) => {
      if (container.isCurrentBound(Route)) {
        container.getAll(Route);
      }
    });
  }
);
