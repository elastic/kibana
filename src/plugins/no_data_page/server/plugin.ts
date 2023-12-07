/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { NoDataPagePluginStartDeps } from '.';
import { getHasApiKeysRoute } from './routes';

export class NoDataPagePlugin implements Plugin<void, void, {}, NoDataPagePluginStartDeps> {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  setup(core: CoreSetup<NoDataPagePluginStartDeps>) {
    core.getStartServices().then(([_, startDeps]) => {
      const { security } = startDeps;

      // initialize internal route(s)
      getHasApiKeysRoute(core.http.createRouter(), {
        logger: this.logger,
        security,
      });
    });

    return {};
  }

  start(_: CoreStart) {
    return {};
  }
}
