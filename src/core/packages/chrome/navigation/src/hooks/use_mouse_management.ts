/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';

import { useHoverTimeout } from './use_hover_timeout';

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
