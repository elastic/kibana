/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import type {
  ScreenshotModeRequestHandlerContext,
  ScreenshotModeServerSetup,
  ScreenshotModeServerStart,
  ScreenshotModeServerSetupDependencies,
  ScreenshotModeServerStartDependencies,
} from './types';
import { isScreenshotMode } from './is_screenshot_mode';
import { setScreenshotContext, setScreenshotModeEnabled } from '../common';

export class ScreenshotModePlugin
  implements
    Plugin<
      ScreenshotModeServerSetup,
      ScreenshotModeServerStart,
      ScreenshotModeServerSetupDependencies,
      ScreenshotModeServerStartDependencies
    >
{
  public setup(core: CoreSetup): ScreenshotModeServerSetup {
    core.http.registerRouteHandlerContext<ScreenshotModeRequestHandlerContext, 'screenshotMode'>(
      'screenshotMode',
      (ctx, req) => {
        return {
          isScreenshot: isScreenshotMode(req),
        };
      }
    );

    return {
      setScreenshotContext,
      setScreenshotModeEnabled,
      isScreenshotMode,
    };
  }

  public start(): ScreenshotModeServerStart {
    return {
      isScreenshotMode,
    };
  }

  public stop() {}
}
