/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { createProfileRunners, type ProfileRunners } from './lib/profile_runner';
import { registerRoutes } from './routes';

export class DeveloperToolbarProfilersServerPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly isDev: boolean;
  private readonly runners: ProfileRunners = createProfileRunners();

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(core: CoreSetup) {
    // The routes skip authorization, so they must never exist outside of dev mode.
    if (this.isDev) {
      registerRoutes(core.http.createRouter(), this.logger, this.runners);
    }
    return {};
  }

  public start() {
    return {};
  }

  public stop() {
    this.runners.cpu.abort();
    this.runners.memory.abort();
  }
}
