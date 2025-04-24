/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BehaviorSubject, distinctUntilChanged, map, skip } from 'rxjs';

import { GridPanelData } from '../../types';
import { useGridLayoutContext } from '../../use_grid_layout_context';
import { useGridLayoutPanelEvents } from '../../use_grid_layout_events';
import { UserInteractionEvent } from '../../use_grid_layout_events/types';

export interface DragHandleApi {
  startDrag: (e: UserInteractionEvent) => void;
  setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}

export const useDragHandleApi = ({
  panel$,
}: {
  panel$: BehaviorSubject<GridPanelData & { rowId: string }>;
}): DragHandleApi => {
  const { useCustomDragHandle } = useGridLayoutContext();

  const [panelId, setPanelId] = useState(panel$.getValue().id);
  const [rowId, setRowId] = useState(panel$.getValue().rowId);

  useEffect(() => {
    const subscription = panel$
      .pipe(
        skip(1),
        map((panel) => ({ id: panel.id, rowId: panel.rowId })),
        distinctUntilChanged(deepEqual)
      )
      .subscribe(({ id, rowId: currentRow }) => {
        setPanelId(id);
        setRowId(currentRow);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [panel$]);

  const { startDrag } = useGridLayoutPanelEvents({
    interactionType: 'drag',
    panelId,
    rowId,
  });

  const removeEventListenersRef = useRef<(() => void) | null>(null);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
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
