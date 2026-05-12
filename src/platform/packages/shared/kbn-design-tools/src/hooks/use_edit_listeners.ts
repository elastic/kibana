/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type MutableRefObject, useEffect, useRef } from 'react';

interface Handlers {
  onPointerMove: (event: PointerEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onClick: (event: MouseEvent) => void;
  onKeydown: (event: KeyboardEvent) => void;
  onAbort: () => void;
}

/**
 * Registers capture-phase document listeners for the edit overlay when active.
 * Handles blur/visibilitychange to abort in-progress gestures.
 * Cleans up all listeners and pending animation frames on deactivate/unmount.
 */
export const useEditListeners = (
  isActive: boolean,
  handlers: Handlers,
  rafId?: MutableRefObject<number>
) => {
  const internalRafId = useRef<number>(0);
  const raf = rafId ?? internalRafId;

  useEffect(() => {
    if (!isActive) return;

    const { onPointerMove, onPointerDown, onPointerUp, onClick, onKeydown, onAbort } = handlers;

    const handleBlur = () => onAbort();
    const handleVisibilityChange = () => {
      if (document.hidden) onAbort();
    };
    const preventNativeDrag = (e: Event) => e.preventDefault();

    const currentRaf = raf;

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('dragstart', preventNativeDrag, true);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelAnimationFrame(currentRaf.current);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerUp, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('dragstart', preventNativeDrag, true);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // handlers is a new object each render but its properties are stable useCallbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isActive,
    handlers.onPointerMove,
    handlers.onPointerDown,
    handlers.onPointerUp,
    handlers.onClick,
    handlers.onKeydown,
    handlers.onAbort,
  ]);

  return raf;
};
