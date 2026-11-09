/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';

/** Capture-phase document pointermove, throttled to one handler call per animation frame. */
export const useThrottledDocumentPointerMove = (handler: (event: PointerEvent) => void): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let rafId = 0;

    const onPointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        handlerRef.current(event);
      });
    };

    document.addEventListener('pointermove', onPointerMove, true);
    return () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      cancelAnimationFrame(rafId);
    };
  }, []);
};

export interface OverlayClickCaptureOptions {
  onActivate: (event: MouseEvent) => void;
  shouldSkip?: (eventTarget: Element) => boolean;
}

/** Capture-phase pointerdown/click wiring shared by devtool overlays. */
export const useOverlayClickCapture = (options: OverlayClickCaptureOptions): void => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleMouseEvent = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (eventTarget instanceof Element && optionsRef.current.shouldSkip?.(eventTarget)) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const isTargetDisabled =
        eventTarget instanceof HTMLElement && eventTarget.hasAttribute('disabled');
      if (event.type === 'click' || isTargetDisabled) {
        optionsRef.current.onActivate(event);
      }
    };

    document.addEventListener('pointerdown', handleMouseEvent, true);
    document.addEventListener('click', handleMouseEvent, true);

    return () => {
      document.removeEventListener('pointerdown', handleMouseEvent, true);
      document.removeEventListener('click', handleMouseEvent, true);
    };
  }, []);
};
