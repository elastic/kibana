/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';
import { registerProxyRoute } from './route';

export class EsProxyPlugin implements Plugin<void, void, {}, {}> {
  private readonly log: ReturnType<PluginInitializerContext['logger']['get']>;

  constructor(initializerContext: PluginInitializerContext) {
    this.log = initializerContext.logger.get();
  }

  public setup({ http }: CoreSetup) {
    const router = http.createRouter();
    registerProxyRoute({ router, log: this.log });
  }

  public start() {}

  public stop() {}
}
