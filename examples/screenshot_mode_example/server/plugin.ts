/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import { registerRoutes } from './routes';
import { RouteDependencies } from './types';

export class ScreenshotModeExamplePlugin implements Plugin<void, void> {
  log: Logger;
  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
  }
  setup(core: CoreSetup, { screenshotMode }: { screenshotMode: ScreenshotModePluginSetup }): void {
    const deps: RouteDependencies = {
      screenshotMode,
      router: core.http.createRouter(),
      log: this.log,
    };

    registerRoutes(deps);
  }

  start() {}
  stop() {}
}
