/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

const HOVER_DELAY = 100;

/**
 * Hook for managing click-based opening (persistent mode)
 */
export const useClickToggle = () => {
  const [isOpenedByClick, setIsOpenedByClick] = useState(false);

  const setClickOpened = useCallback(() => setIsOpenedByClick(true), []);
  const clearClickOpened = useCallback(() => setIsOpenedByClick(false), []);

  return { isOpenedByClick, setClickOpened, clearClickOpened };
};

/**
 * Hook for click outside detection
 */
export const useClickOutside = (
  isOpen: boolean,
  persistent: boolean,
  popoverRef: RefObject<HTMLElement>,
  triggerRef: RefObject<HTMLElement>,
  onClose: () => void
) => {
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!persistent || !isOpen) return;

      const target = e.target as Node;
      const isOutsidePopover = popoverRef.current && !popoverRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);

      if (isOutsidePopover && isOutsideTrigger) {
        onClose();
      }
    },
    [persistent, isOpen, popoverRef, triggerRef, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);
};

/**
 * Hook for managing hover timeouts
 */
const useHoverTimeout = () => {
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

/**
 * Hook for mouse interactions
 */
export const useHover = (
  persistent: boolean,
  isOpenedByClick: boolean,
  isSidePanelOpen: boolean,
  { open, close }: { open: () => void; close: () => void }
) => {
  const { setTimeout, clearTimeout } = useHoverTimeout();

  const handleMouseEnter = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      clearTimeout();
      if (!isSidePanelOpen) {
        open();
      }
    }
  }, [persistent, isOpenedByClick, isSidePanelOpen, clearTimeout, open]);

  const handleMouseLeave = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      setTimeout(close, HOVER_DELAY);
    }
  }, [persistent, isOpenedByClick, setTimeout, close]);

  return { handleMouseEnter, handleMouseLeave, clearTimeout };
};
