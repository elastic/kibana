/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import type { RouteDependencies } from './types';
import { registerRoutes } from './routes';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ScreenshotModeExamplePlugin extends Service {
  static readonly inject = ['core.http', 'screenshotMode.setup'];
  static readonly provide = 'screenshotModeExample';

  constructor(ctx: Context) {
    super(ctx, 'screenshotModeExample');
    const screenshotMode = (ctx.get('screenshotMode.setup') as any).contract;
    const deps: RouteDependencies = {
          screenshotMode,
          router: (ctx.get('core.http') as any).createRouter(),
          log: (ctx.get('core.logger') as any).get('plugins', 'screenshotModeExample'),
        };

        registerRoutes(deps);
  }
}
