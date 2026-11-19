/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Navigator with User-Agent Client Hints API support.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
 */
interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: { platform?: string };
}

/**
 * Normalized platform string, resolved once at module load. Prefers the
 * userAgentData API with fallback to navigator.userAgent and navigator.platform.
 * Guards against non-browser environments where `navigator` is not available.
 */
const platformIdentifier = (() => {
  if (typeof navigator === 'undefined') {
    return '';
  }

  const nav = navigator as NavigatorWithUserAgentData;
  const platform = nav.userAgentData?.platform ?? nav.userAgent ?? nav.platform ?? '';

  return platform.toLowerCase();
})();

/** Whether the current platform is macOS. */
export const isMac: boolean = platformIdentifier.includes('mac');
