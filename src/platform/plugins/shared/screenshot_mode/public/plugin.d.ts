/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  ScreenshotModePublicSetup,
  ScreenshotModePublicSetupDependencies,
  ScreenshotModePublicStart,
  ScreenshotModePublicStartDependencies,
} from './types';
export declare class ScreenshotModePlugin
  implements
    Plugin<
      ScreenshotModePublicSetup,
      ScreenshotModePublicStart,
      ScreenshotModePublicSetupDependencies,
      ScreenshotModePublicStartDependencies
    >
{
  private publicContract;
  setup(_core: CoreSetup): ScreenshotModePublicSetup;
  start(_core: CoreStart): ScreenshotModePublicStart;
  stop(): void;
}
