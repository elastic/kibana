/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
