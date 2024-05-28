/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, PluginInitializerContext, CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import {
  defineReducerStreamRoute,
  defineReduxStreamRoute,
  defineSimpleStringStreamRoute,
} from './routes';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResponseStreamSetupPlugins {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResponseStreamStartPlugins {}

export class ResponseStreamPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: ResponseStreamSetupPlugins) {
    const router = core.http.createRouter<DataRequestHandlerContext>();

    void core.getStartServices().then(([_, depsStart]) => {
      defineReducerStreamRoute(router, this.logger);
      defineReduxStreamRoute(router, this.logger);
      defineSimpleStringStreamRoute(router, this.logger);
    });
  }

  public start(core: CoreStart, plugins: ResponseStreamStartPlugins) {}

  public stop() {}
}
