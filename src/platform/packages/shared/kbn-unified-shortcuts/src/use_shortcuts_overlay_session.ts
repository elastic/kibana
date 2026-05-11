/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

interface UseShortcutsOverlaySessionProps {
  isVisible: boolean;
  onHiddenKeyDown: (event: KeyboardEvent) => void;
  onVisibleKeyDown: (event: KeyboardEvent) => void;
  onVisiblePointerDown: () => void;
}

export const useShortcutsOverlaySession = ({
  isVisible,
  onHiddenKeyDown,
  onVisibleKeyDown,
  onVisiblePointerDown,
}: UseShortcutsOverlaySessionProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isVisible) {
        onVisibleKeyDown(event);
        return;
      }

      onHiddenKeyDown(event);
    };

    const onPointerDown = () => {
      if (isVisible) {
        onVisiblePointerDown();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [isVisible, onHiddenKeyDown, onVisibleKeyDown, onVisiblePointerDown]);
};
