/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';

import { ScreenshotModePluginSetup, ScreenshotModePluginStart } from './types';

import { getScreenshotMode, getScreenshotLayout } from '../common';

export class ScreenshotModePlugin implements Plugin<ScreenshotModePluginSetup> {
  private publicContract = Object.freeze({
    isScreenshotMode: () => getScreenshotMode() === true,
    getScreenshotLayout,
  });

  public setup(core: CoreSetup): ScreenshotModePluginSetup {
    return this.publicContract;
  }

  public start(core: CoreStart): ScreenshotModePluginStart {
    return this.publicContract;
  }

  public stop() {}
}
