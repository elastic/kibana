/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { OpenAiPluginSetup, OpenAiPluginStart } from './types';
import { defineRoutes } from './routes';
import type { OpenAiConfig } from './config';

export class OpenAiPlugin implements Plugin<OpenAiPluginSetup, OpenAiPluginStart> {
  private readonly config: OpenAiConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<OpenAiConfig>();
  }

  public setup(core: CoreSetup) {
    defineRoutes({ core, config: this.config });

    return {};
  }

  public start(_: CoreStart) {
    return {};
  }

  public stop() {}
}
