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
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerInspectComponentRoutes } from './routes';

export class InspectComponentPluginServer implements Plugin {
  private readonly logger: Logger;
  private readonly isDevMode: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDevMode = initializerContext.env.mode.dev;
  }

  public setup(core: CoreSetup) {
    if (this.isDevMode) {
      registerInspectComponentRoutes({ http: core.http, logger: this.logger });
    }

    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
