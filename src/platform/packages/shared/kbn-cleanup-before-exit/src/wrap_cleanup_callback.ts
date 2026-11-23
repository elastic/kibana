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
import { withTimeout } from '@kbn/std';
import type { CleanupBeforeExitOptions, CleanupHandlerCallback } from './types';

const DEFAULT_TIMEOUT = 5000;

export function wrapCleanupCallback(
  cb: CleanupHandlerCallback,
  processExitSignal: AbortSignal,
  options: CleanupBeforeExitOptions
): () => Promise<void> {
  return once(() => {
    const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT;
    const work = Promise.resolve().then(() => cb());

    let removeExitListener = () => {};
    const raced = options.blockExit
      ? work
      : Promise.race([
          work,
          new Promise<never>((_, reject) => {
            const rejectOnProcessExit = () => {
              reject(new Error('Process exited before cleanup could finish'));
            };
            if (processExitSignal.aborted) {
              rejectOnProcessExit();
            } else {
              processExitSignal.addEventListener('abort', rejectOnProcessExit);
              removeExitListener = () =>
                processExitSignal.removeEventListener('abort', rejectOnProcessExit);
            }
          }),
        ]);

    return withTimeout({ promise: raced, timeoutMs, unref: true })
      .then((outcome) => {
        if (outcome.timedout) {
          diag.warn(`Timeout of ${timeoutMs}ms reached before cleanup could finish`);
        }
      })
      .catch((error) => {
        diag.warn(error);
      })
      .finally(removeExitListener);
  });
}
