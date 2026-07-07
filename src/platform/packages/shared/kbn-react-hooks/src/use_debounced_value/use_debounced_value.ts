/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';

const DEFAULT_WAIT = 300;
const defaultCompare = <T>(a: T, b: T) => a === b;

export interface UseDebouncedValueOptions<T> {
  /**
   * Custom comparison function. Return `true` when the values should be
   * considered equal (skip the debounce). Defaults to strict equality (`===`).
   */
  compare?: (a: T, b: T) => boolean;
}

/**
 * Returns a debounced version of the provided value. The returned value only
 * updates after the specified wait period has elapsed since the last change.
 *
 * @param value - The value to debounce.
 * @param wait - Milliseconds to delay before updating. Defaults to 300.
 * @param options - Optional configuration.
 * @param options.compare - Custom equality check; return `true` to treat values as equal.
 *
 * @returns The debounced value.
 */
export const useDebouncedValue = <T>(
  value: T,
  wait: number = DEFAULT_WAIT,
  options?: UseDebouncedValueOptions<T>
): T => {
  const compareRef = useLatest(options?.compare ?? defaultCompare);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    if (compareRef.current(previousValueRef.current, value)) {
      return;
    }

    previousValueRef.current = value;

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, wait);

    return () => {
      clearTimeout(timer);
    };
  }, [value, wait, compareRef]);

  return debouncedValue;
};
