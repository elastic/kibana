/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce, isFunction } from 'lodash';
import { useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useUnmount from 'react-use/lib/useUnmount';

type Noop = (...args: any[]) => any;

export interface DebounceOptions {
  wait?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

/**
 * Custom hook that returns a React safe debounced version of the provided function.
 *
 * @param {Function} fn - The function to debounce.
 * @param {Object} [options] - Optional configuration options for debounce.
 * @param {number} [options.wait=1000] - The number of milliseconds to delay.
 * @param {boolean} [options.leading=false] - Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true] - Specify invoking on the trailing edge of the timeout.
 * @param {number} [options.maxWait] - The maximum time `fn` is allowed to be delayed before it's invoked.
 *
 * @returns {Object} - An object containing the debounced function (`run`), and methods to cancel (`cancel`) or flush (`flush`) the debounce.
 *
 * @throws {Error} - Throws an error if the provided `fn` is not a function.
 *
 * @caveat The debounce does not cancel if `options` or `wait` are changed between calls.
 */

export function useDebounceFn<T extends Noop>(fn: T, options?: DebounceOptions) {
  if (!isFunction(fn)) {
    throw Error(`useDebounceFn expected parameter is a function, got ${typeof fn}`);
  }

  const fnRef = useLatest(fn);

  const wait = options?.wait ?? 1000;

  const debounced = useMemo(
    () =>
      debounce(
        (...args: Parameters<T>): ReturnType<T> => {
          return fnRef.current(...args);
        },
        wait,
        options
      ),
    [fnRef, options, wait]
  );

  useUnmount(() => {
    debounced.cancel();
  });

  return {
    run: debounced,
    cancel: debounced.cancel,
    flush: debounced.flush,
  };
}
