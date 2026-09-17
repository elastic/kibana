/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';

export class DevCommentsServerPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly isDev: boolean;
  private readonly isEnabled: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    this.isEnabled = initializerContext.config.get<ConfigSchema>().enabled;
  }

  public setup(core: CoreSetup) {
    // The storage code (hidden index, internal-user client, routes without
    // authorization) is only ever loaded in dev mode.
    if (this.isEnabled && this.isDev) {
      const router = core.http.createRouter();
      const client = core.getStartServices().then(async ([{ elasticsearch }]) => {
        const { CommentsClient } = await import('./comments_client');
        return new CommentsClient(elasticsearch.client.asInternalUser, this.logger);
      });
      import('./routes')
        .then(({ registerCommentsRoutes }) => registerCommentsRoutes(router, client))
        .catch((error) => {
          this.logger.error(`Failed to register the dev comments routes: ${error}`);
        });
    }
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
