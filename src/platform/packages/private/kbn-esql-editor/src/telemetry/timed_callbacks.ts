/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';

/**
 * Wraps each function in an ESQLCallbacks object with timing instrumentation.
 *
 * Parallel callbacks are not double-counted: only time where at
 * least one callback is being executed is accumulated.
 *
 * Returns the wrapped callbacks and a getter for the total time
 * spent inside callback invocations.
 */
export const createTimedCallbacks = (
  callbacks: ESQLCallbacks
): {
  callbacks: ESQLCallbacks;
  getCallbacksDuration: () => number;
} => {
  let totalDuration = 0;
  let activeCount = 0;
  let activeStart = 0;

  /**
   *  How this two (onStart, onEnd) works?
   *  If many callbacks are called in parallel, the first one starting (activeCount === 0) sets the start time.
   *  The last one ending ( when activeCount reachs 0 again) is the one that closes the totalDuration.
   */
  const onStart = () => {
    if (activeCount === 0) {
      activeStart = performance.now();
    }
    activeCount++;
  };
  const onEnd = () => {
    activeCount--;
    if (activeCount === 0) {
      totalDuration += performance.now() - activeStart;
    }
  };

  const timedCallbacks: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(callbacks)) {
    // Don't wrap non-function callbacks (e.g. `isServerless`)
    if (typeof value !== 'function') {
      timedCallbacks[key] = value;
      continue;
    }

    timedCallbacks[key] = (...args: unknown[]) => {
      const result = (value as Function)(...args);

      // If the result is a promise, wrap it in the onStart and onEnd logic
      if (result instanceof Promise) {
        onStart();
        result.finally(onEnd);
      }

      return result;
    };
  }

  return {
    callbacks: timedCallbacks as ESQLCallbacks,
    getCallbacksDuration: () => totalDuration,
  };
};
