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
import { RouterService } from '@kbn/core-http-server';
import { DiService } from '@kbn/core-di';

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
      .inSingletonScope();
  });
}

export function createPluginStartModule(context: CoreStart): interfaces.ContainerModule {
  return new ContainerModule((bind) => {
    bind(DiService).toConstantValue(context.injection);
  });
}
