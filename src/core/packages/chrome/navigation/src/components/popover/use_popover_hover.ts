/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';

import { useHoverTimeout } from '../../hooks/use_hover_timeout';
import { POPOVER_HOVER_DELAY } from '../../constants';
import { getIsAnyPopoverOpenNow } from './use_popover_open';

/**
 * Hook for mouse interactions
 */
export const usePopoverHover = (
  persistent: boolean,
  isOpenedByClick: boolean,
  isSidePanelOpen: boolean,
  { open, close }: { open: () => void; close: () => void }
) => {
  const { setTimeout, clearTimeout } = useHoverTimeout();

  const tryOpen = useCallback(() => {
    if (!isSidePanelOpen && !getIsAnyPopoverOpenNow()) {
      open();
    }
  }, [isSidePanelOpen, open]);

  const handleMouseEnter = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      clearTimeout();
      if (getIsAnyPopoverOpenNow()) {
        setTimeout(tryOpen, POPOVER_HOVER_DELAY);
      } else if (!isSidePanelOpen) {
        setTimeout(open, POPOVER_HOVER_DELAY);
      }
    }
  }, [persistent, isOpenedByClick, isSidePanelOpen, clearTimeout, open, setTimeout, tryOpen]);

  const handleMouseLeave = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      setTimeout(close, POPOVER_HOVER_DELAY);
    }
  }, [persistent, isOpenedByClick, setTimeout, close]);

  return { handleMouseEnter, handleMouseLeave, clearTimeout };
};
