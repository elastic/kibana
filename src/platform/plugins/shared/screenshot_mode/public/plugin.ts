/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { getScreenshotContext, getScreenshotMode } from '../common';
import type {
  ScreenshotModePublicSetup,
  ScreenshotModePublicSetupDependencies,
  ScreenshotModePublicStart,
  ScreenshotModePublicStartDependencies,
} from './types';

export class ScreenshotModePlugin
  implements
    Plugin<
      ScreenshotModePublicSetup,
      ScreenshotModePublicStart,
      ScreenshotModePublicSetupDependencies,
      ScreenshotModePublicStartDependencies
    >
{
  private publicContract = Object.freeze({
    getScreenshotContext,
    isScreenshotMode: () => getScreenshotMode() === true,
  });

  public setup(_core: CoreSetup): ScreenshotModePublicSetup {
    return this.publicContract;
  }

  public start(_core: CoreStart): ScreenshotModePublicStart {
    return this.publicContract;
  }

  public stop() {}
}
