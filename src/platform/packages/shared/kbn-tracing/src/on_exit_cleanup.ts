/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';

/**
 * Overrides process.exit() and allows async processes to clean up,
 * which we can use to shutdown exporters.
 */
export function installShutdownHandlers(
  cleanup: () => Promise<void>,
  options: {
    timeout?: number;
  } = {}
) {
  const originalExit = process.exit.bind(process);

  const timeout = options.timeout ?? 5000;

  const shutdown = once((exitCode: string | number | null) => {
    Promise.race([
      cleanup(),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error(`Cleanup did not complete in time, exiting`)), timeout)
      ),
    ])
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(err);
      })
      .then((response) => {
        return response;
      })
      .finally(() => {
        originalExit(exitCode);
      });
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    shutdown(1);
  });

  // @ts-expect-error
  process.exit = (code = 0) => {
    shutdown(code);
  };
}
