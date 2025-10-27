/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import { diag } from '@opentelemetry/api';
import type { CleanupBeforeExitOptions, CleanupHandlerCallback } from './types';

const DEFAULT_TIMEOUT = 5000;

export function wrapCleanupCallback(
  cb: CleanupHandlerCallback,
  processExitSignal: AbortSignal,
  options: CleanupBeforeExitOptions
): () => Promise<void> {
  return once(() => {
    return Promise.race([
      Promise.resolve().then(() => cb()),
      new Promise<void>((_, reject) => {
        function rejectOnProcessExit() {
          reject(new Error(`Process exited before cleanup could finish`));
        }

        function rejectOnTimeout() {
          reject(new Error(`Timeout of ${timeout}ms reached before cleanup could finish`));
        }

        const timeout = options.timeout ?? DEFAULT_TIMEOUT;
        if (!options.blockExit) {
          if (processExitSignal.aborted) {
            rejectOnProcessExit();
          } else {
            processExitSignal.addEventListener('abort', rejectOnProcessExit);
          }
        }
        setTimeout(rejectOnTimeout, timeout).unref();
      }),
    ]).catch((error) => {
      diag.warn(error);
    });
  });
}
