/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { registerFavorites } from '@kbn/content-management-favorites-server';
import { Core } from './core';
import { initRpcRoutes, registerProcedures, RpcService } from './rpc';
import type { Context as RpcContext } from './rpc';
import type {
  ContentManagementServerSetup,
  ContentManagementServerStart,
  ContentManagementServerSetupDependencies,
  ContentManagementServerStartDependencies,
} from './types';
import { procedureNames } from '../common/rpc';

export class ContentManagementPlugin
  implements
    Plugin<
      ContentManagementServerSetup,
      ContentManagementServerStart,
      ContentManagementServerSetupDependencies,
      ContentManagementServerStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly core: Core;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();

    this.core = new Core({
      logger: this.logger,
    });
  }

  public setup(core: CoreSetup, plugins: ContentManagementServerSetupDependencies) {
    const { api: coreApi, contentRegistry } = this.core.setup();

    const rpc = new RpcService<RpcContext>();
    registerProcedures(rpc, this.logger);

    const router = core.http.createRouter();
    initRpcRoutes(procedureNames, router, {
      rpc,
      contentRegistry,
    });

    const favoritesSetup = registerFavorites({
      core,
      logger: this.logger,
      usageCollection: plugins.usageCollection,
    });

    return {
      ...coreApi,
      favorites: favoritesSetup,
    };
  }

  public start(core: CoreStart) {
    return {};
  }
}
