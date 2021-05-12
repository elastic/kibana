/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '../../../core/server';
import { KBN_SCREENSHOT_MODE_HEADER } from './constants';
import { ScreenshotModeRequestHandlerContext } from './types';

export class ScreenshotModePlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.http.registerRouteHandlerContext<ScreenshotModeRequestHandlerContext, 'screenshotMode'>(
      'screenshotMode',
      (ctx, req) => {
        return {
          isScreenshot: Object.keys(req.headers).some((header) => {
            return header.toLowerCase() === KBN_SCREENSHOT_MODE_HEADER;
          }),
        };
      }
    );
  }

  public start() {}

  public stop() {}
}
