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
import { isScreenshotMode } from './is_screenshot_mode';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ScreenshotModePlugin extends Service {
  static readonly inject = ['core.http'];
  static readonly provide = 'screenshotMode';

  constructor(ctx: Context) {
    super(ctx, 'screenshotMode');
    (ctx.get('core.http') as any).registerRouteHandlerContext(
      'screenshotMode',
      (_reqCtx: unknown, req: unknown) => {
        return {
          isScreenshot: isScreenshotMode(req as any),
        };
      }
    );
  }
}
