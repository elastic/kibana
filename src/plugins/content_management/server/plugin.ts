/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, Plugin, PluginInitializerContext, Logger } from '@kbn/core/server';
import { PLUGIN_ID } from '../common';
import { ContentCore } from './core';
import { wrapError } from './error_wrapper';
import { initRpcRoutes, FunctionHandler, initRpcHandlers } from './rpc';
import type { Context as RpcContext } from './rpc';

export class ContentManagementPlugin implements Plugin {
  private readonly logger: Logger;
  private contentCore: ContentCore;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.contentCore = new ContentCore();
  }

  public setup(core: CoreSetup): void {
    this.logger.info(`>>>> [${PLUGIN_ID}] setup...`);

    const fnHandler = new FunctionHandler<RpcContext>();
    initRpcHandlers(fnHandler);
    const router = core.http.createRouter();
    initRpcRoutes(router, { logger: this.logger, wrapError, fnHandler, context: {} });

    this.contentCore.setup();
  }

  public start() {
    this.logger.info(`>>>> [${PLUGIN_ID}] start...`);

    return {
      ...this.contentCore.start(),
    };
  }
}
