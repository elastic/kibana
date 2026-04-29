/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/server';

import { registerRoutes } from './routes';

export class NodeDebuggingRoutesPlugin implements Plugin<void, void> {
  private readonly logger: ReturnType<PluginInitializerContext['logger']['get']>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): void {
    const router = core.http.createRouter();
    registerRoutes(this.logger, router);
  }

  public start(): void {}

  public stop(): void {}
}
