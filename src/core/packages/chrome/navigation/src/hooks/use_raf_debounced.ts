/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Hook that returns a debounced callback using `requestAnimationFrame`.
 *
 * @param fn - the callback function to debounce.
 */
export function useRafDebouncedCallback(fn: () => void) {
  const rafIdRef = useRef<number | null>(null);
  const fnRef = useRef(fn);

  // Always call the latest fn
  useLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const schedule = useCallback(() => {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      fnRef.current();
    });
  }, []);

  const cancel = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // Auto-cancel on unmount
  useLayoutEffect(() => () => cancel(), [cancel]);

  return [schedule, cancel] as const;
}
