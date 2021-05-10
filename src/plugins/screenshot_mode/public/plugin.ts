/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';

import { ScreenshotModePluginSetup } from './types';

import { ScreenshotModeService } from './screenshot_mode_service';

export class ScreenshotModePlugin implements Plugin<ScreenshotModePluginSetup> {
  private readonly screenshotModeService = new ScreenshotModeService();

  public setup(core: CoreSetup): ScreenshotModePluginSetup {
    return {
      isScreenshotMode: this.screenshotModeService.isScreenshotMode,
    };
  }

  public start(core: CoreStart) {}

  public stop() {}
}
