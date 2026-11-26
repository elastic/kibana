/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { ResizableLayoutMode } from '../types';

interface FocusSnapshot {
  element: Element | null;
}

/**
 * Restores focus lost when a mode change moves panel content (e.g. a reverse portal) to a new parent.
 */
export const useRestoreFocusOnModeChange = (mode: ResizableLayoutMode): void => {
  const [trackedMode, setTrackedMode] = useState(mode);
  const [focusSnapshot, setFocusSnapshot] = useState<FocusSnapshot>();

  // Switching between static and resizable modes swaps the panel containers, which detaches
  // the panel content from the DOM and drops focus. Capture the focused element during render,
  // before React commits those DOM changes.
  if (mode !== trackedMode) {
    setTrackedMode(mode);
    setFocusSnapshot({ element: document.activeElement });
  }

  useEffect(() => {
    const element = focusSnapshot?.element;

    if (!(element instanceof HTMLElement) || !element.isConnected) {
      return;
    }

    const { activeElement } = document;
    const isFocusLost = !activeElement || activeElement === document.body;

    if (isFocusLost) {
      element.focus({ preventScroll: true });
    }
  }, [focusSnapshot]);
};
