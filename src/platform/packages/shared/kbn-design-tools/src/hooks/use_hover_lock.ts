/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';

import { CONTROLS_HEIGHT, LOCK_PADDING } from '../lib/constants';

interface HoverLockBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  elementBottom: number;
}

/**
 * Tracks an expanded bounds zone below the hovered element (where the controls
 * panel lives) and provides a check to determine if the pointer is inside it.
 * This prevents retargeting when the cursor moves toward the controls, while
 * still allowing children inside the element to be targeted normally.
 */
export const useHoverLock = (hoverTarget: HTMLElement | null) => {
  const bounds = useRef<HoverLockBounds | null>(null);

  useEffect(() => {
    if (hoverTarget) {
      const rect = hoverTarget.getBoundingClientRect();
      bounds.current = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom + CONTROLS_HEIGHT,
        elementBottom: rect.bottom,
      };
    } else {
      bounds.current = null;
    }
  }, [hoverTarget]);

  const isInsideHoverLock = useCallback((x: number, y: number): boolean => {
    const b = bounds.current;
    if (!b) return false;
    return (
      x >= b.left - LOCK_PADDING &&
      x <= b.right + LOCK_PADDING &&
      y > b.elementBottom &&
      y <= b.bottom + LOCK_PADDING
    );
  }, []);

  const clearLock = useCallback(() => {
    bounds.current = null;
  }, []);

  return { isInsideHoverLock, clearLock };
};
