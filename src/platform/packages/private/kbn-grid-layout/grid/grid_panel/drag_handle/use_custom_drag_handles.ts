/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';

import type { UserInteractionEvent } from '../../use_grid_layout_events/types';

/**
 * Attaches the drag listeners to custom drag handles (and keeps `dragHandleClass` on them),
 * cleaning up the previous handles whenever `startDrag` changes and on unmount.
 */
export const useCustomDragHandles = ({
  startDrag,
  dragHandleClass,
}: {
  startDrag: (e: UserInteractionEvent) => void;
  dragHandleClass: string;
}): ((dragHandles: Array<HTMLElement | null>) => void) => {
  const removeEventListenersRef = useRef<(() => void) | null>(null);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      /**
       * if new `startDrag` reference (which happens when, for example, panels change sections),
       * then clean up the old event listeners
       */
      removeEventListenersRef.current?.();

      const classObservers: MutationObserver[] = [];

      for (const handle of dragHandles) {
        if (handle === null) continue;
        handle.addEventListener('mousedown', startDrag, { passive: true });
        handle.addEventListener('touchstart', startDrag, { passive: true });
        handle.addEventListener('keydown', startDrag);
        handle.classList.add(dragHandleClass);
        // React className updates drop the imperatively added class, so re-add it
        const classObserver = new MutationObserver(() => {
          if (!handle.classList.contains(dragHandleClass)) {
            handle.classList.add(dragHandleClass);
          }
        });
        classObserver.observe(handle, { attributes: true, attributeFilter: ['class'] });
        classObservers.push(classObserver);
      }
      removeEventListenersRef.current = () => {
        classObservers.forEach((observer) => observer.disconnect());
        for (const handle of dragHandles) {
          if (handle === null) continue;
          handle.removeEventListener('mousedown', startDrag);
          handle.removeEventListener('touchstart', startDrag);
          handle.removeEventListener('keydown', startDrag);
        }
      };
    },
    [startDrag, dragHandleClass]
  );

  useEffect(
    () => () => {
      // on unmount, remove all drag handle event listeners
      removeEventListenersRef.current?.();
    },
    []
  );

  return setDragHandles;
};
