/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useReducer, useRef } from 'react';

/**
 * Passes `value` through while `isActive`; while inactive it trails the value by `delayMs` of quiet.
 *
 * Meant for a hidden editor that mirrors the store: it need not repaint on every edit made elsewhere,
 * but must show the live text the moment it becomes visible. While active the settled value follows
 * `value` in a ref, so typing in the visible editor costs no extra render and going inactive starts
 * from the current text, never an older one.
 */
export const useInactiveDebouncedValue = (
  value: string,
  isActive: boolean,
  delayMs: number
): string => {
  const settledRef = useRef(value);
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  if (isActive) {
    settledRef.current = value;
  }

  useEffect(() => {
    if (isActive || settledRef.current === value) return undefined;
    const timer = setTimeout(() => {
      settledRef.current = value;
      rerender();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, isActive, delayMs]);

  return settledRef.current;
};
