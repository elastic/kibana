/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type interfaces, ContainerModule } from 'inversify';
import type { CoreSetup, CoreStart } from '@kbn/core-lifecycle-server';
import {
  ConfigService,
  LoggerService,
  LoggingService,
  HttpService,
  OpaqueIdToken,
  type PluginInitializerContext,
} from '@kbn/core-plugins-server';
import {
  type IRouteHandler,
  RequestToken,
  ResponseToken,
  Route,
  type RouteRegistrar,
  RouterService,
} from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { DiService, Global } from '@kbn/core-di-common';

export function createCoreModule() {
  return new ContainerModule(() => {});
}

export function createPluginInitializerModule(
  context: PluginInitializerContext
): interfaces.ContainerModule {
  return new ContainerModule((bind) => {
    bind(OpaqueIdToken).toConstantValue(context.opaqueId);
    bind(ConfigService).toConstantValue(context.config);
    bind(LoggerService).toConstantValue(context.logger);
  });
}

export function createPluginSetupModule(context: CoreSetup): interfaces.ContainerModule {
  return new ContainerModule((bind) => {
    bind(LoggingService).toConstantValue(context.logging);
    bind(HttpService).toConstantValue(context.http);
    bind(RouterService)
      .toDynamicValue(({ container }) => container.get(HttpService).createRouter())
      .inSingletonScope()
      .onActivation(({ container }, router) => {
        (container.isCurrentBound(Route) ? container.getAll(Route) : []).forEach((route) => {
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
        });

        return router;
      });

    bind(Global).toConstantValue(RouterService);
  });
}

export function createPluginStartModule(context: CoreStart): interfaces.ContainerModule {
  return new ContainerModule((bind) => {
    bind(DiService).toConstantValue(context.injection);
  });
}
