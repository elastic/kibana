/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// **PLEASE NOTE**
// The functionality in this file targets a browser environment AND is intended to be used both in public and server.
// For instance, reporting uses these functions when starting puppeteer to set the current browser into "screenshot" mode.

export const KBN_SCREENSHOT_MODE_ENABLED_KEY = '__KBN_SCREENSHOT_MODE_ENABLED_KEY__';

declare global {
  interface Window {
    [KBN_SCREENSHOT_MODE_ENABLED_KEY]?: boolean;
  }
}

/**
 * This function is responsible for detecting whether we are currently in screenshot mode.
 *
 * We check in the current window context whether screenshot mode is enabled, otherwise we check
 * localStorage. The ability to set a value in localStorage enables more convenient development and testing
 * in functionality that needs to detect screenshot mode.
 */
export const getScreenshotMode = (): boolean => {
  return (
    window[KBN_SCREENSHOT_MODE_ENABLED_KEY] === true ||
    window.localStorage.getItem(KBN_SCREENSHOT_MODE_ENABLED_KEY) === 'true'
  );
};

/**
 * Use this function to set the current browser to screenshot mode.
 *
 * This function should be called as early as possible to ensure that screenshot mode is
 * correctly detected for the first page load. It is not suitable for use inside any plugin
 * code unless the plugin code is guaranteed to, somehow, load before any other code.
 *
 * Additionally, we don't know what environment this code will run in so we remove as many external
 * references as possible to make it portable. For instance, running inside puppeteer.
 */
export const setScreenshotModeEnabled = () => {
  Object.defineProperty(
    window,
    '__KBN_SCREENSHOT_MODE_ENABLED_KEY__', // Literal value to prevent adding an external reference
    {
      enumerable: true,
      writable: true,
      configurable: false,
      value: true,
    }
  );
};

export const setScreenshotModeDisabled = () => {
  Object.defineProperty(
    window,
    '__KBN_SCREENSHOT_MODE_ENABLED_KEY__', // Literal value to prevent adding an external reference
    {
      enumerable: true,
      writable: true,
      configurable: false,
      value: undefined,
    }
  );
};
