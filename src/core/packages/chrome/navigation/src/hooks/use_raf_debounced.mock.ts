/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useLayoutEffect, useRef } from 'react';
import type { useRafDebouncedCallback as useRafDebouncedCallbackActual } from './use_raf_debounced';

/**
 * A hook that mocks a debounced callback using requestAnimationFrame for testing with synchronous execution.
 * @param fn - The callback function to debounce.
 */
export const useRafDebouncedCallback: typeof useRafDebouncedCallbackActual = (fn: () => void) => {
  const fnRef = useRef(fn);

  // Always call the latest fn
  useLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const schedule = useCallback(() => {
    // Execute immediately (synchronous) instead of using RAF
    fnRef.current();
  }, []);

  const cancel = useCallback(() => {
    // No-op in mock - nothing to cancel since we execute immediately
  }, []);

  return [schedule, cancel] as const;
};
