/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, ContainerModule } from 'inversify';
import type { RouteRegistrar } from '@kbn/core-http-server';
import { CoreSetup, CoreStart, Request, Response, Route, Router } from '@kbn/core-di-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { Global, OnSetup } from '@kbn/core-di';

/** @internal */
export const http = new ContainerModule(({ bind, onActivation }) => {
  onActivation(Route, ({ get }, route) => {
    const router = get(Router);
    const register = router[route.method] as RouteRegistrar<
      typeof route.method,
      RequestHandlerContext
    >;

    register(route, async (_context, request, response) => {
      const scope = get(CoreStart('injection')).fork();

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
    .toResolvedValue((httpSetup) => httpSetup.createRouter(), [CoreSetup('http')])
    .inRequestScope()
    .onActivation(({ get }, router) => {
      const container = get(Container);
      if (!container.isCurrentBound(Router)) {
        container.bind(Router).toConstantValue(router);
      }

      return router;
    });

  bind(OnSetup).toConstantValue((container) => {
    container.getAll(Route);
  });
});
