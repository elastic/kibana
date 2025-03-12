/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';

import { GridLayoutStateManager, RowInteractionEvent } from '../types';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { commitAction, moveAction, startAction } from './row_state_manager_actions';
import {
  getPointerPosition,
  isMouseEvent,
  isTouchEvent,
  startMouseInteraction,
  startTouchInteraction,
} from './sensors';
import { UserInteractionEvent } from './types';

export const useGridLayoutRowEvents = ({
  interactionType,
  rowId,
}: {
  interactionType: RowInteractionEvent['type'];
  rowId: string;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const pointerPixel = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const startingMouse = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const startingPosition = useRef<{ top: number; right: number }>({ top: 0, right: 0 });

  const startInteraction = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;

      const onStart = () =>
        startAction(e, gridLayoutStateManager, rowId, startingPosition, startingMouse);

      const onMove = (ev: UserInteractionEvent) => {
        if (isMouseEvent(ev) || isTouchEvent(ev)) {
          pointerPixel.current = getPointerPosition(ev);
        }
        moveAction(
          gridLayoutStateManager,
          rowId,
          startingPosition.current,
          startingMouse.current,
          pointerPixel.current
        );
      };

      const onEnd = () => commitAction(gridLayoutStateManager);

      if (isMouseEvent(e)) {
        e.stopPropagation();
        startMouseInteraction({
          e,
          onStart,
          onMove,
          onEnd,
        });
      } else if (isTouchEvent(e)) {
        startTouchInteraction({
          e,
          onStart,
          onMove,
          onEnd,
        });
      }
    },
    [gridLayoutStateManager, rowId]
  );

  return startInteraction;
};

const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};
