/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { getScreenshotContext, getScreenshotMode } from '../common';
import type { ScreenshotModePluginSetup, ScreenshotModePluginStart } from './types';

export class ScreenshotModePlugin implements Plugin<ScreenshotModePluginSetup> {
  private publicContract = Object.freeze({
    getScreenshotContext,
    isScreenshotMode: () => getScreenshotMode() === true,
  });

  public setup(core: CoreSetup): ScreenshotModePluginSetup {
    return this.publicContract;
  }

  public start(core: CoreStart): ScreenshotModePluginStart {
    return this.publicContract;
  }

  public stop() {}
}
