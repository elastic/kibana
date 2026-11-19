/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect } from 'react';
import { isUndoShortcut, isRedoShortcut } from '../../../../lib/keyboard_shortcuts';

/**
 * Intercepts Cmd+Z / Cmd+Shift+Z within the edit modal for draft
 * undo/redo. Stops propagation to prevent the main EditOverlay from
 * handling these shortcuts.
 *
 * @param onUndo - Callback for the undo shortcut.
 * @param onRedo - Callback for the redo shortcut.
 */
export const useModalKeyboard = (onUndo: () => void, onRedo: () => void): void => {
  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isRedoShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        onRedo();
      } else if (isUndoShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        onUndo();
      }
    },
    [onUndo, onRedo]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeydown, true);
    return () => document.removeEventListener('keydown', handleKeydown, true);
  }, [handleKeydown]);
};
