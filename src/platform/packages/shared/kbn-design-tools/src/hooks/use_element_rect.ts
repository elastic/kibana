/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Track the viewport-relative bounding rect of an element, updating
 * automatically on scroll (capture phase) and window resize.
 *
 * Scroll and resize handlers are throttled via `requestAnimationFrame`
 * to avoid redundant `getBoundingClientRect` calls and layout thrashing.
 *
 * @param target - The element to track.
 * @returns The current viewport-relative bounding rect.
 */
export const useElementRect = (target: HTMLElement): DOMRect => {
  const [rect, setRect] = useState(() => target.getBoundingClientRect());
  const rafId = useRef(0);

  const sync = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setRect(target.getBoundingClientRect());
    });
  }, [target]);

  useEffect(() => {
    // Synchronous initial read so the first paint is correct.
    setRect(target.getBoundingClientRect());

    document.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      cancelAnimationFrame(rafId.current);
      document.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [sync, target]);

  return rect;
};
