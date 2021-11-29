/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  getScreenshotMode,
  setScreenshotModeEnabled,
  setScreenshotModeDisabled,
  KBN_SCREENSHOT_MODE_ENABLED_KEY,
  KBN_SCREENSHOT_MODE_LAYOUT_KEY,
  setScreenshotLayout,
  getScreenshotLayout,
} from './get_set_browser_screenshot_mode';

export type { Layout } from './get_set_browser_screenshot_mode';

export { KBN_SCREENSHOT_MODE_HEADER } from './constants';
