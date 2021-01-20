/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { wrapFunction, wrapAsyncFunction } from './wrap_function';

/**
 *  Wraps a "runnable" defining function (it(), beforeEach(), etc.)
 *  so that any "runnable" arguments passed to it are wrapped and will
 *  trigger a lifecycle event if they throw an error.
 */
export function wrapRunnableArgs(fn, lifecycle, handler) {
  return wrapFunction(fn, {
    before(target, thisArg, argumentsList) {
      for (let i = 0; i < argumentsList.length; i++) {
        if (typeof argumentsList[i] === 'function') {
          argumentsList[i] = wrapAsyncFunction(argumentsList[i], {
            async before(target, thisArg) {
              await lifecycle.beforeEachRunnable.trigger(thisArg);
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
