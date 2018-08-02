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

module.exports = { cancelable };

/**
 * Runs a sequence of promise-returning functions, waiting on each promise
 * before calling the next, and passing each function the result of the previous
 * function's promise. The result of the last function will be the result of
 * the entire cancellable promise. If the promise is canceled, it the promise
 * will reject with something like this:
 * { status: 'cancelled', runCount: 3, message: 'Promise cancelled' }.
 *
 * @param {function[]} pipeline - A list of functions to be run in sequence.
 */
function cancelable(...pipeline) {
  // Are we attempting to cancel the promise?
  let isCanceled = false;

  // Has the run function exited?
  let isExited = false;

  // A function which, when called, will resolve the promise
  // that was returned by the cancel method. This allows callers
  // of promise.cancel() to wait for cancellation to complete.
  let resolveCancel;

  // The promise that was returned by the currently running
  // function from the pipeline.
  let runningPromise;

  // Run each function in sequence, checking to see if we have
  // been canceled prior to running each function.
  async function run() {
    try {
      let result;
      let runCount = 0;

      for (const fn of pipeline) {
        if (isCanceled) {
          const error = new Error('Promise cancelled');
          error.status = 'cancelled';
          error.runCount = runCount;
          throw error;
        }

        runningPromise = fn(result);
        result = await runningPromise;
        ++runCount;
      }

      return result;
    } finally {
      // Clean up
      runningPromise = undefined;
      isExited = true;

      // Resolve the promise returned by cancel, if there is one.
      if (resolveCancel) {
        resolveCancel();
      }
    }
  }

  // The promise that we'll augment with cancellation functionality.
  const cancelablePromise = run();

  /**
   * Cancels the promise, waiting for the promise to gracefully exit prior
   * to returning. If passed `{ graceful: false }`, this will return immediately.
   */
  cancelablePromise.cancel = function (opts = { graceful: true }) {
    isCanceled = true;

    // If the currently executing promise is itself cancelable, cancel it.
    if (runningPromise && runningPromise.cancel) {
      return runningPromise.cancel(opts);
    }

    // Otherwise, we'll return a promise, and optionally wait for a graceful exit.
    return new Promise(resolve => {
      if (isExited || !opts.graceful) {
        resolve();
      } else {
        resolveCancel = resolve;
      }
    });
  };

  return cancelablePromise;
}
