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
import { registerCommentsRoutes } from './routes';

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
    // Nothing of the storage (hidden index, internal-user client, routes without
    // authorization) exists outside dev mode. The routes are registered here and
    // now, so they are in place before the browser can call them; the storage
    // code itself is loaded once Kibana has started, the handlers wait for it.
    if (this.isEnabled && this.isDev) {
      const client = core.getStartServices().then(async ([{ elasticsearch }]) => {
        const { CommentsClient } = await import('./comments_client');
        return new CommentsClient(elasticsearch.client.asInternalUser, this.logger);
      });
      // Every request is answered with the failure again; this only keeps it from going unhandled meanwhile.
      client.catch((error) => {
        this.logger.error(`Failed to load the dev comments storage: ${error}`);
      });
      registerCommentsRoutes(core.http.createRouter(), client);
    }
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
