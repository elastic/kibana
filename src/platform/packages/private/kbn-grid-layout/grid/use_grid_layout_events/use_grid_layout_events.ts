/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import {
  GridPanelData,
  GridLayoutStateManager,
  PanelInteractionEvent,
  UserInteractionEvent,
} from '../types';
import {
  getPointerPosition,
  isMouseEvent,
  isTouchEvent,
  startMouseInteraction,
  startTouchInteraction,
} from './sensors';
import { commitAction, moveAction, startAction } from './state_manager_actions';

export const useGridLayoutEvents = ({
  interactionType,
  gridLayoutStateManager,
  rowIndex,
  panelId,
}: {
  interactionType: PanelInteractionEvent['type'];
  gridLayoutStateManager: GridLayoutStateManager;
  rowIndex: number;
  panelId: string;
}) => {
  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);
  const pointerPixel = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });

  const startInteraction = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;

      const onStart = () =>
        startAction(e, gridLayoutStateManager, interactionType, rowIndex, panelId);

      const onMove = (ev: UserInteractionEvent) => {
        if (isMouseEvent(ev) || isTouchEvent(ev)) {
          pointerPixel.current = getPointerPosition(ev);
        }
        moveAction(gridLayoutStateManager, pointerPixel.current, lastRequestedPanelPosition);
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
    [gridLayoutStateManager, rowIndex, panelId, interactionType]
  );

  return startInteraction;
};

const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};
