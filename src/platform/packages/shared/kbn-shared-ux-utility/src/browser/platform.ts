/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type Platform = 'mac' | 'windows' | 'linux' | 'other';

const PLATFORM_PATTERNS = {
  mac: 'mac',
  windows: 'win',
  linux: 'linux',
} as const;

/**
 * Navigator with User-Agent Client Hints API support.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
 */
interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: { platform?: string };
}

/**
 * Platform detection IIFE - runs once at module load.
 * Gets the normalized platform string from the browser's navigator API.
 * Prefers the modern userAgentData API with fallback to navigator.userAgent and navigator.platform.
 *
 * Note: The `typeof navigator === 'undefined'` check is defensive code for
 * non-browser environments (SSR/Node.js) where `navigator` is not available.
 */
const platformIdentifier = (() => {
  if (typeof navigator === 'undefined') {
    return '';
  }

  const nav = navigator as NavigatorWithUserAgentData;
  const platform = nav.userAgentData?.platform ?? nav.userAgent ?? nav.platform ?? '';

  return platform.toLowerCase();
})();

/**
 * Checks if the current platform is macOS.
 */
export const isMac: boolean = platformIdentifier.includes(PLATFORM_PATTERNS.mac);

/**
 * Checks if the current platform is Windows.
 */
export const isWindows: boolean = platformIdentifier.includes(PLATFORM_PATTERNS.windows);

/**
 * Checks if the current platform is Linux.
 */
export const isLinux: boolean = platformIdentifier.includes(PLATFORM_PATTERNS.linux);

/**
 * Gets the current platform as a standardized string.
 */
export const getPlatform = (): Platform => {
  if (isMac) return 'mac';
  if (isWindows) return 'windows';
  if (isLinux) return 'linux';
  return 'other';
};
