/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext, KibanaRequest } from 'src/core/server';
import type { Layout } from '../common';

/**
 * Any context that requires access to the screenshot mode flag but does not have access
 * to request context {@link ScreenshotModeRequestHandlerContext}, for instance if they are pre-context,
 * can use this function to check whether the request originates from a client that is in screenshot mode.
 */
type IsScreenshotMode = (request: KibanaRequest) => boolean;

export interface ScreenshotModePluginSetup {
  isScreenshotMode: IsScreenshotMode;

  /**
   * Set the current environment to screenshot mode. Intended to run in a browser-environment, before any other scripts
   * on the page have run to ensure that screenshot mode is detected as early as possible.
   */
  setScreenshotModeEnabled: () => void;

  /** @deprecated */
  setScreenshotLayout: (value: Layout) => void;
}

export interface ScreenshotModePluginStart {
  isScreenshotMode: IsScreenshotMode;
}

export interface ScreenshotModeRequestHandlerContext extends RequestHandlerContext {
  screenshotMode: {
    isScreenshot: boolean;
  };
}
