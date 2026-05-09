/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';

/**
 * Hook to manage a global cursor style override.
 * Injects/removes a `<style>` element that forces a cursor on all elements.
 */
export const useCursorOverride = () => {
  const styleEl = useRef<HTMLStyleElement | null>(null);

  const setCursor = useCallback((cursor: string) => {
    if (!styleEl.current) {
      styleEl.current = document.createElement('style');
      document.head.appendChild(styleEl.current);
    }
    styleEl.current.textContent = cursor ? `* { cursor: ${cursor} !important; }` : '';
  }, []);

  const removeCursor = useCallback(() => {
    if (styleEl.current) {
      styleEl.current.remove();
      styleEl.current = null;
    }
  }, []);

  return { setCursor, removeCursor };
};
