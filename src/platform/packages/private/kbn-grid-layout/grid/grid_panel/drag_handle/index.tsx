/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { GridLayoutStateManager } from '../../types';
import { useGridLayoutEvents } from '../../use_grid_layout_events';
import { DefaultDragHandle } from './default_drag_handle';

export interface DragHandleApi {
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
}

export const DragHandle = React.forwardRef<
  DragHandleApi,
  {
    gridLayoutStateManager: GridLayoutStateManager;
    panelId: string;
    rowIndex: number;
  }
>(({ gridLayoutStateManager, panelId, rowIndex }, ref) => {
  const startInteraction = useGridLayoutEvents({
    interactionType: 'drag',
    gridLayoutStateManager,
    panelId,
    rowIndex,
  });

  const [dragHandleCount, setDragHandleCount] = useState<number>(0);
  const removeEventListenersRef = useRef<(() => void) | null>(null);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      setDragHandleCount(dragHandles.length);
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

  useImperativeHandle(ref, () => ({ setDragHandles }), [setDragHandles]);

  return Boolean(dragHandleCount) ? null : <DefaultDragHandle onDragStart={startInteraction} />;
});
