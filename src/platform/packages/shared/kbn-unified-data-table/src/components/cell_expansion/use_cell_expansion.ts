/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface CellExpansion {
  /** Viewport rect of what opened the expansion popover; undefined while it is closed. */
  anchorRect?: DOMRect;
  /** Opens the popover below the given element, or below the cell when none is given. */
  open: (anchor?: HTMLElement | null) => void;
  close: () => void;
}

/** Manages the expansion popover of a grid cell, which is anchored to the rect of its trigger. */
export const useCellExpansion = (cellRef: RefObject<HTMLElement | null>): CellExpansion => {
  const [anchorRect, setAnchorRect] = useState<DOMRect>();
  const isOpen = anchorRect !== undefined;

  const open = useCallback(
    (anchor?: HTMLElement | null) => {
      const cell = cellRef.current;
      // Focus the cell first, so the popover's focus trap returns focus to it when it closes.
      cell?.focus({ preventScroll: true });
      const rect = (anchor ?? cell)?.getBoundingClientRect();
      if (rect) {
        setAnchorRect(rect);
      }
    },
    [cellRef]
  );
  const close = useCallback(() => setAnchorRect(undefined), []);

  // The popover is anchored to a fixed rect, so it would be left behind when the cell scrolls.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && event.target.contains(cellRef.current)) {
        close();
      }
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [isOpen, cellRef, close]);

  return useMemo(() => ({ anchorRect, open, close }), [anchorRect, open, close]);
};
