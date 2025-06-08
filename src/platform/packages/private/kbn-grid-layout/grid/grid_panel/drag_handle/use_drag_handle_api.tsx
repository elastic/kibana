/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';

import { useGridLayoutContext } from '../../use_grid_layout_context';
import { useGridLayoutPanelEvents } from '../../use_grid_layout_events';
import { UserInteractionEvent } from '../../use_grid_layout_events/types';

export interface DragHandleApi {
  startDrag: (e: UserInteractionEvent) => void;
  setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}

export const useDragHandleApi = ({
  panelId,
  sectionId,
}: {
  panelId: string;
  sectionId?: string;
}): DragHandleApi => {
  const { useCustomDragHandle } = useGridLayoutContext();

  const startDrag = useGridLayoutPanelEvents({
    interactionType: 'drag',
    panelId,
    sectionId,
  });

  const removeEventListenersRef = useRef<(() => void) | null>(null);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      /**
       * if new `startDrag` reference (which happens when, for example, panels change sections),
       * then clean up the old event listeners
       */
      removeEventListenersRef.current?.();

      for (const handle of dragHandles) {
        if (handle === null) return;
        handle.addEventListener('mousedown', startDrag, { passive: true });
        handle.addEventListener('touchstart', startDrag, { passive: true });
        handle.addEventListener('keydown', startDrag);
        handle.classList.add('kbnGridPanel--dragHandle');
      }
      removeEventListenersRef.current = () => {
        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.removeEventListener('mousedown', startDrag);
          handle.removeEventListener('touchstart', startDrag);
          handle.removeEventListener('keydown', startDrag);
        }
      };
    },
    [startDrag]
  );

  useEffect(
    () => () => {
      // on unmount, remove all drag handle event listeners
      removeEventListenersRef.current?.();
    },
    []
  );

  return {
    startDrag,
    setDragHandles: useCustomDragHandle ? setDragHandles : undefined,
  };
};
