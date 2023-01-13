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
import { PLUGIN_ID } from '../common';
import { ContentCore, ContentCoreApi } from './core';
import { wrapError } from './error_wrapper';
import { initRpcRoutes, FunctionHandler, initRpcHandlers } from './rpc';
import type { Context as RpcContext } from './rpc';
import { FooStorage } from './demo';

export class ContentManagementPlugin implements Plugin {
  private readonly logger: Logger;
  private contentCore: ContentCore;
  private coreApi: ContentCoreApi | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.contentCore = new ContentCore({ logger: this.logger });
  }

  public setup(core: CoreSetup) {
    this.logger.info(`>>>> [${PLUGIN_ID}] setup...`);

    this.coreApi = this.contentCore.setup();

    const fnHandler = new FunctionHandler<RpcContext>();
    initRpcHandlers(fnHandler);

    const router = core.http.createRouter();

    initRpcRoutes(router, {
      logger: this.logger,
      wrapError,
      fnHandler,
      context: { core: this.coreApi },
    });

    // --------------- DEMO -------------------
    // Add a "in memory" content
    const storage = new FooStorage();
    this.coreApi.register('foo', {
      storage,
    });

    const addContent = async () => {
      // Add dummy content
      await storage.create({
        title: 'Foo',
        description: 'Some description',
        foo: false,
      });
    };
    addContent();
    // ----------------------------------------

    return {
      ...this.coreApi,
    };
  }

  public start(core: CoreStart) {
    const esClient = core.elasticsearch.client.asInternalUser;
    this.contentCore.start({ esClient });
  }
}
