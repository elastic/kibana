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
import type { ConfigSchema } from './config';

export class InspectComponentPluginServer implements Plugin {
  private readonly logger: Logger;
  private readonly isDev: boolean;
  private readonly isEnabled: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    const { enabled } = initializerContext.config.get<ConfigSchema>();
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    this.isEnabled = enabled;
  }

  public setup(core: CoreSetup) {
    if (this.isEnabled && this.isDev) {
      import('./routes/routes')
        .then(({ registerInspectComponentRoutes }) => {
          registerInspectComponentRoutes({ httpService: core.http, logger: this.logger });
        })
        .catch(() => {
          this.logger.error('Failed to import plugin files.');
        });
    }

    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
