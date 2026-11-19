/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';

/** An `initialize()` still running after this long logs a warning. It is not a timeout. */
export const SLOW_INITIALIZE_WARNING_MS = 10_000;

/**
 * Runs a plugin's `initialize()` and logs its outcome. Rejects with the original error when it
 * fails.
 */
export const runPluginInitialize = ({
  pluginName,
  log,
  initialize,
}: {
  pluginName: string;
  log: Logger;
  initialize: () => Promise<void>;
}): Promise<void> => {
  const startedAt = performance.now();
  const slowTimer = setTimeout(() => {
    log.warn(
      `Plugin "${pluginName}" initialize() has been running for ` +
        `${Math.round((performance.now() - startedAt) / 1000)}s and has not finished.`
    );
  }, SLOW_INITIALIZE_WARNING_MS);
  // Node-only API, guarded for environments where timers are mocked without `unref`.
  slowTimer.unref?.();

  log.debug(`Plugin "${pluginName}": running initialize().`);

  // Calling `initialize` inside the chain turns a synchronous throw into a failed run. A failure is
  // logged and rethrown, never handled here, so a run nobody awaits stays an unhandled rejection.
  return Promise.resolve()
    .then(initialize)
    .finally(() => clearTimeout(slowTimer))
    .then(
      () => {
        log.info(
          `Plugin "${pluginName}" initialized in ${Math.round(performance.now() - startedAt)}ms.`
        );
      },
      (error: unknown) => {
        log.error(
          `Plugin "${pluginName}" initialize() failed after ${Math.round(
            performance.now() - startedAt
          )}ms: ${error instanceof Error ? error.stack : error}`
        );
        throw error;
      }
    );
};
