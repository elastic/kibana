/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';

import { ApiRoutes } from './routes';

export class IndexPatternPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly apiRoutes: ApiRoutes;

  constructor({ logger }: PluginInitializerContext) {
    this.logger = logger.get();
    this.apiRoutes = new ApiRoutes();
  }

  public setup({ http }: CoreSetup) {
    this.logger.debug('index_pattern_field_editor: setup');

    const router = http.createRouter();
    this.apiRoutes.setup({ router });
  }

  public start() {}

  public stop() {}
}
