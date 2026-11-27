/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { isSelectionModifier } from './selection_modifier';

/**
 * Tracks whether the panel selection modifier key (see `isSelectionModifier`) is currently held, so the
 * UI can hint that hovered panels are selectable before any gesture happens.
 */
export const useSelectionModifierHeld = (enabled: boolean): boolean => {
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsHeld(false);
      return;
    }

    // keydown/keyup carry the current modifier state, including the release of the modifier itself
    const onKey = (e: KeyboardEvent) => setIsHeld(isSelectionModifier(e));
    // a modifier release is lost when it happens while the window is not focused (e.g. Cmd+Tab)
    const onBlur = () => setIsHeld(false);
    // the mouse re-entering the page carries the modifier state too, in case a keyup was missed
    const onMouseMove = (e: MouseEvent) => setIsHeld(isSelectionModifier(e));

    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);

  return isHeld;
};
