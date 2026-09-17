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
import { CommentsClient } from './comments/comments_client';
import { registerCommentsRoutes } from './comments/routes';

export class DeveloperToolbarServerPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly isEnabled: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isEnabled = initializerContext.config.get<ConfigSchema>().enabled;
  }

  public setup(core: CoreSetup) {
    if (this.isEnabled) {
      const client = core
        .getStartServices()
        .then(
          ([{ elasticsearch }]) =>
            new CommentsClient(elasticsearch.client.asInternalUser, this.logger)
        );
      registerCommentsRoutes(core.http.createRouter(), client);
    }
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
