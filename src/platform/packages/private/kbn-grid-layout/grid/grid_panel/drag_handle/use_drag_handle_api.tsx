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
  rowId,
}: {
  panelId: string;
  rowId: string;
}): DragHandleApi => {
  const { useCustomDragHandle } = useGridLayoutContext();

  const startDrag = useGridLayoutPanelEvents();

  // we use ref because subscription is inside of the stable useEffect so the state would be stale
  const rowIdRef = useRef(rowId);
  // Keep ref in sync with state
  useEffect(() => {
    rowIdRef.current = rowId;
  }, [rowId]);

  const startInteraction = useCallback(
    (ev: UserInteractionEvent) => {
      return startDrag(ev, { interactionType: 'drag', rowId: rowIdRef.current, panelId });
    },
    [panelId]
  );

  const removeEventListenersRef = useRef<(() => void) | null>(null);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      for (const handle of dragHandles) {
        if (handle === null) return;
        console.log('Adding drag handle event listeners');
        handle.addEventListener('mousedown', startInteraction, { passive: true });
        handle.addEventListener('touchstart', startInteraction, { passive: true });
        handle.addEventListener('keydown', startInteraction);
        handle.classList.add('kbnGridPanel--dragHandle');
      }
      removeEventListenersRef.current = () => {
        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.removeEventListener('mousedown', startInteraction);
          handle.removeEventListener('touchstart', startInteraction);
          handle.removeEventListener('keydown', startInteraction);
        }
      };
    },
    [startInteraction]
  );

  useEffect(
    () => () => {
      console.log('Cleaning up drag handle event listeners');
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
