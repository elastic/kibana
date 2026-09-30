/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { wrapFunction, wrapAsyncFunction } from './wrap_function';

/**
 *  Wraps a "runnable" defining function (it(), beforeEach(), etc.)
 *  so that any "runnable" arguments passed to it are wrapped and will
 *  trigger a lifecycle event if they throw an error.
 */
export function wrapRunnableArgs(fn, lifecycle, handler, options = {}) {
  const { hookTimeout, testTimeout } = options;
  return wrapFunction(fn, {
    before(target, thisArg, argumentsList) {
      for (let i = 0; i < argumentsList.length; i++) {
        if (typeof argumentsList[i] === 'function') {
          argumentsList[i] = wrapAsyncFunction(argumentsList[i], {
            async before(target, thisArg) {
              if (lifecycle.isAborting) {
                // fail fast instead of waiting out the full hook/test timeout
                const runnable = thisArg.test;
                if (runnable && typeof runnable.timeout === 'function') {
                  runnable.timeout(1);
                }
                throw new Error('FTR run aborted (mocha timeout) - skipping remaining runnable');
              }

              await lifecycle.beforeEachRunnable.trigger(thisArg);
              if (typeof hookTimeout === 'number') {
                const runnable = thisArg.test;
                if (
                  runnable &&
                  typeof runnable.timeout === 'function' &&
                  runnable.timeout() === testTimeout
                ) {
                  runnable.timeout(hookTimeout);
                }
              }
            },

            async handleError(target, thisArg, argumentsList, err) {
              await handler(err, thisArg.test);
              throw err;
            },
          });
        }
      }
    },
  });
}
