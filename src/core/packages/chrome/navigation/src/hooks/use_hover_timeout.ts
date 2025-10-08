/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook for managing hover timeouts
 */
export const useHoverTimeout = () => {
  const timeoutRef = useRef<number | null>(null);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setTimeout = useCallback(
    (callback: () => void, delay: number) => {
      clearTimeout();
      timeoutRef.current = window.setTimeout(callback, delay);
    },
    [clearTimeout]
  );

  useEffect(() => clearTimeout, [clearTimeout]);

  return { setTimeout, clearTimeout };
};
