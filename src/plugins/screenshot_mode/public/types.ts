/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ScreenshotModePluginSetup {
  /**
   * Retrieves a value from the screenshotting context.
   * @param key Context key to get.
   * @param defaultValue Value to return if the key is not found.
   * @return The value stored in the screenshotting context.
   */
  getScreenshotContext<T = unknown>(key: string, defaultValue?: T): T | undefined;

  /**
   * Returns a boolean indicating whether the current user agent (browser) would like to view UI optimized for
   * screenshots or printing.
   */
  isScreenshotMode(): boolean;
}

export type ScreenshotModePluginStart = ScreenshotModePluginSetup;
