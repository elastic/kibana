/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RefObject, useCallback, useEffect } from 'react';

import { useFocusTrap } from './use_focus_management';

/**
 * Hook for keyboard event handling
 */
export const useKeyboardManagement = (
  isOpen: boolean,
  onClose: () => void,
  triggerRef: RefObject<HTMLElement>,
  popoverRef: RefObject<HTMLElement>
) => {
  const trapFocus = useFocusTrap(popoverRef);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          triggerRef.current?.focus();
          break;
        case 'Enter':
          onClose();
          break;
        default:
          trapFocus(e);
      }
    },
    [isOpen, onClose, triggerRef, trapFocus]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isOpen, handleKeyDown]);
};
