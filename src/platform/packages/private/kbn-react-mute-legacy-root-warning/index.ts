/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

const MUTE_WARNINGS = [
  /**
   * After we upgrade to React 18, we will see a warning in the console that we are using the legacy ReactDOM.render API.
   * This warning is expected as we are in the process of migrating to the new createRoot API.
   * However, it is very noisy and we want to mute it for now.
   */
  "Warning: ReactDOM.render is no longer supported in React 18. Use createRoot instead. Until you switch to the new API, your app will behave as if it's running React 17.",

  /**
   * React 18 concurrent mode logs a “race-condition” warning on unmount of nested roots.
   * Tests show no real breakage, so we silence it for now.
   * Revisit if the warning ever surfaces as an actual bug.
   */
  'Warning: Attempted to synchronously unmount a root while React was already rendering.',
];

/**
 * Mutes React 18 warnings while we're in transition phase
 */
export function muteLegacyRootWarning() {
  const originalConsoleError = console.error;
  console.error = (message, ...args) => {
    if (typeof message === 'string' && MUTE_WARNINGS.some((warning) => message.includes(warning))) {
      return;
    }

    originalConsoleError.call(console, message, ...args);
  };

  /* unmute */
  return () => {
    console.error = originalConsoleError;
  };
}
