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
import { EventStreamService } from './event_stream';
import { procedureNames } from '../common/rpc';

export class ContentManagementPlugin
  implements Plugin<ContentManagementServerSetup, ContentManagementServerStart, SetupDependencies>
{
  private readonly logger: Logger;
  private readonly core: Core;
  readonly #eventStream?: EventStreamService;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();

    // TODO: Enable Event Stream once we ready to log events.
    // const kibanaVersion = initializerContext.env.packageInfo.version;
    // this.#eventStream = new EventStreamService({
    //   logger: this.logger,
    //   clientFactory: new EsEventStreamClientFactory({
    //     baseName: '.kibana',
    //     kibanaVersion,
    //     logger: this.logger,
    //   }),
    // });

    this.core = new Core({
      logger: this.logger,
      eventStream: this.#eventStream,
    });
  }

  public setup(core: CoreSetup) {
    if (this.#eventStream) {
      this.#eventStream.setup({ core });
    }

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
    if (this.#eventStream) {
      this.#eventStream.start();
    }

    return {};
  }

  public async stop(): Promise<void> {
    if (this.#eventStream) {
      try {
        await this.#eventStream.stop();
      } catch (e) {
        this.logger.error(`Error during event stream stop: ${e}`);
      }
    }
  }
}
