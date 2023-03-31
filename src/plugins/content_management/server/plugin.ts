/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { Core } from './core';
import { initRpcRoutes, registerProcedures, RpcService } from './rpc';
import type { Context as RpcContext } from './rpc';
import {
  ContentManagementServerSetup,
  ContentManagementServerStart,
  SetupDependencies,
} from './types';
import { procedureNames } from '../common/rpc';

type CreateRouterFn = CoreSetup['http']['createRouter'];

export class ContentManagementPlugin
  implements Plugin<ContentManagementServerSetup, ContentManagementServerStart, SetupDependencies>
{
  private readonly logger: Logger;
  private readonly core: Core;

  constructor(initializerContext: { logger: PluginInitializerContext['logger'] }) {
    this.logger = initializerContext.logger.get();
    this.core = new Core({ logger: this.logger });
  }

  public setup(core: { http: { createRouter: CreateRouterFn } }) {
    const { api: coreApi, contentRegistry } = this.core.setup();

    const rpc = new RpcService<RpcContext>();
    registerProcedures(rpc);

    const router = core.http.createRouter();
    initRpcRoutes(procedureNames, router, {
      rpc,
      contentRegistry,
    });

    return {
      ...coreApi,
    };
  }

  public start(core: CoreStart) {
    return {};
  }
}
