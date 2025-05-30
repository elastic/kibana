/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { throttle, isFunction } from 'lodash';
import { useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useUnmount from 'react-use/lib/useUnmount';

type Noop = (...args: any[]) => any;

export interface ThrottleOptions {
  wait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Custom hook that returns a React safe  throttled version of the provided function.
 *
 * @param {Function} fn - The function to throttle.
 * @param {Object} [options] - Optional configuration options for throttle.
 * @param {number} [options.wait=1000] - The number of milliseconds to delay.
 * @param {boolean} [options.leading=true] - Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=false] - Specify invoking on the trailing edge of the timeout.
 *
 * @returns {Object} - An object containing the throttled function (`run`), and methods to cancel (`cancel`) or flush (`flush`) the throttle.
 *
 * @throws {Error} - Throws an error if the provided `fn` is not a function.
 *
 * @caveat The throttle does not cancel if `options` or `wait` are changed between calls.
 */
export function useThrottleFn<T extends Noop>(fn: T, options?: ThrottleOptions) {
  if (!isFunction(fn)) {
    throw Error(`useThrottleFn expected parameter is a function, got ${typeof fn}`);
  }

  const fnRef = useLatest(fn);

  const wait = options?.wait ?? 1000;

  const throttled = useMemo(
    () =>
      throttle(
        (...args: Parameters<T>): ReturnType<T> => {
          return fnRef.current(...args);
        },
        wait,
        options
      ),
    [fnRef, options, wait]
  );

  useUnmount(() => {
    throttled.cancel();
  });

  return {
    run: throttled,
    cancel: throttled.cancel,
    flush: throttled.flush,
  };
}
