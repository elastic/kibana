/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScreenshotModePlugin } from './plugin';

export function plugin() {
  return new ScreenshotModePlugin();
}

export {
  KBN_SCREENSHOT_MODE_HEADER,
  setScreenshotModeEnabled,
  KBN_SCREENSHOT_MODE_ENABLED_KEY,
} from '../common';

export type { ScreenshotModePluginSetup, ScreenshotModePluginStart } from './types';
