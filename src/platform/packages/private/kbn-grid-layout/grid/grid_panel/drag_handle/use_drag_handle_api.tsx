/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';

import { useGridLayoutPanelEvents } from '../../use_grid_layout_events/panel_events';
import { UserInteractionEvent } from '../../use_grid_layout_events/types';
import { useGridLayoutContext } from '../../use_grid_layout_context';

export interface DragHandleApi {
  startDrag: (e: UserInteractionEvent) => void;
  setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}

export const useDragHandleApi = ({
  panelId,
  rowId,
}: {
  panelId: string;
  rowId: string;
}): DragHandleApi => {
  const { useCustomDragHandle } = useGridLayoutContext();

  const startInteraction = useGridLayoutPanelEvents({
    interactionType: 'drag',
    panelId,
    rowId,
  });

  const removeEventListenersRef = useRef<(() => void) | null>(null);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      for (const handle of dragHandles) {
        if (handle === null) return;
        handle.addEventListener('mousedown', startInteraction, { passive: true });
        handle.addEventListener('touchstart', startInteraction, { passive: true });
        handle.style.touchAction = 'none';
      }
      removeEventListenersRef.current = () => {
        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.removeEventListener('mousedown', startInteraction);
          handle.removeEventListener('touchstart', startInteraction);
        }
      };
    },
    [startInteraction]
  );

  useEffect(
    () => () => {
      // on unmount, remove all drag handle event listeners
      removeEventListenersRef.current?.();
    },
    []
  );

  return {
    startDrag: startInteraction,
    setDragHandles: useCustomDragHandle ? setDragHandles : undefined,
  };
};
