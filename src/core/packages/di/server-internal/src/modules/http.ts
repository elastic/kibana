/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import type { RequestHandler, RouteRegistrar } from '@kbn/core-http-server';
import { CoreSetup, CoreStart, Request, Response, Route, Router } from '@kbn/core-di-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { cacheInScope, Global } from '@kbn/core-di-internal';
import { OnSetup } from '@kbn/core-di';

export function loadHttp({ bind, onActivation }: ContainerModuleLoadOptions): void {
  onActivation(Route, ({ get }, route) => {
    const router = get(Router);
    const register = router[route.method] as RouteRegistrar<
      typeof route.method,
      RequestHandlerContext
    >;
    let handler: RequestHandler = async (_context, request, response) => {
      const scope = get(CoreStart('injection')).fork();

      scope.bind(Request).toConstantValue(request);
      scope.bind(Response).toConstantValue(response);
      scope.bind(Global).toConstantValue(Request);
      scope.bind(Global).toConstantValue(Response);

      try {
        return await scope.get(route, { autobind: true }).handle();
      } finally {
        scope.unbindAll();
      }
    };

    if (route.handleLegacyErrors) {
      handler = router.handleLegacyErrors(handler);
    }

    register(route, handler);

    return route;
  });

  bind(Router)
    .toResolvedValue((httpSetup) => httpSetup.createRouter(), [CoreSetup('http')])
    .inRequestScope()
    .onActivation(cacheInScope(Router));

  bind(OnSetup).toConstantValue((container) => {
    container.getAll(Route);
  });
}
