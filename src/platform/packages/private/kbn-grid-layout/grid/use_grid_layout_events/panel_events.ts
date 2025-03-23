/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { GridPanelData, PanelInteractionEvent } from '../types';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { commitAction, moveAction, startAction, cancelAction } from './panel_state_manager_actions';
import {
  getSensorPosition,
  isMouseEvent,
  isTouchEvent,
  startMouseInteraction,
  startTouchInteraction,
  startKeyboardInteraction,
  isKeyboardEvent,
} from './sensors';
import { PointerPosition, UserInteractionEvent } from './types';
import { getNextPositionForPanel } from './utils/keyboard_utils';
import { isLayoutInteractive } from './utils';
/*
 * This hook sets up and manages drag/resize interaction logic for grid panels.
 * It initializes event handlers to start, move, and commit the interaction,
 * ensuring responsive updates to the panel's position and grid layout state.
 * The interaction behavior is dynamic and adapts to the input type (mouse or touch).
 */
export const useGridLayoutPanelEvents = ({
  interactionType,
  rowId,
  panelId,
}: {
  interactionType: PanelInteractionEvent['type'];
  rowId: string;
  panelId: string;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);
  const pointerPixel = useRef<PointerPosition>({ clientX: 0, clientY: 0 });

  const onStart = useCallback(
    (ev: UserInteractionEvent) => {
      startAction(ev, gridLayoutStateManager, interactionType, rowId, panelId);
    },
    [gridLayoutStateManager, interactionType, rowId, panelId]
  );

  const onEnd = useCallback(() => {
    commitAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onBlur = useCallback(() => {
    const {
      interactionEvent$: { value: { id, type, targetRow } = {} },
    } = gridLayoutStateManager;
    // make sure the user hasn't started another interaction in the meantime
    if (id === panelId && rowId === targetRow && type === interactionType) {
      commitAction(gridLayoutStateManager);
    }
  }, [gridLayoutStateManager, panelId, rowId, interactionType]);

  const onCancel = useCallback(() => {
    cancelAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onMove = useCallback(
    (ev: UserInteractionEvent) => {
      if (isMouseEvent(ev) || isTouchEvent(ev)) {
        pointerPixel.current = getSensorPosition(ev);
      } else if (isKeyboardEvent(ev)) {
        pointerPixel.current = getNextPositionForPanel(
          ev,
          gridLayoutStateManager,
          pointerPixel.current
        );
      }
      return moveAction(
        ev,
        gridLayoutStateManager,
        pointerPixel.current,
        lastRequestedPanelPosition
      );
    },
    [gridLayoutStateManager]
  );

  const startInteraction = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;
      pointerPixel.current = getSensorPosition(e);

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
      } else if (isKeyboardEvent(e)) {
        const isEventActive = gridLayoutStateManager.interactionEvent$.value !== undefined;
        startKeyboardInteraction({
          e,
          isEventActive,
          onStart,
          onMove,
          onEnd,
          onBlur,
          onCancel,
          shouldScrollToEnd: interactionType === 'resize',
        });
      }
    },
    [gridLayoutStateManager, interactionType, onStart, onMove, onEnd, onBlur, onCancel]
  );

  return { startDrag: startInteraction, onBlur: onEnd };
};
