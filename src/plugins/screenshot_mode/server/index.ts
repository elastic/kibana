/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  setScreenshotModeEnabled,
  KBN_SCREENSHOT_MODE_HEADER,
  KBN_SCREENSHOT_MODE_ENABLED_KEY,
} from '../common';

export type {
  ScreenshotModeRequestHandlerContext,
  ScreenshotModeServerSetup as ScreenshotModePluginSetup,
  ScreenshotModeServerStart as ScreenshotModePluginStart,
} from './types';

export async function plugin() {
  const { ScreenshotModePlugin } = await import('./plugin');
  return new ScreenshotModePlugin();
}
