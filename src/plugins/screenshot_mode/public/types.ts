/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Layout } from '../common';

export interface IScreenshotModeService {
  /**
   * Returns a boolean indicating whether the current user agent (browser) would like to view UI optimized for
   * screenshots or printing.
   */
  isScreenshotMode: () => boolean;

  /** @deprecated */
  getScreenshotLayout: () => undefined | Layout;
}

export type ScreenshotModePluginSetup = IScreenshotModeService;
export type ScreenshotModePluginStart = IScreenshotModeService;
