/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  CoreStart,
} from '@kbn/core/server';
import { typeA, typeB } from './saved_objects';
import { registerSearchExampleRoutes } from './search_example_routes';

export class SavedObjectsExamplePlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    core.savedObjects.registerType(typeA);
    core.savedObjects.registerType(typeB);
    const router = core.http.createRouter();
    registerSearchExampleRoutes(router, this.logger);
  }

  public start(core: CoreStart) {}

  public stop() {}
}
