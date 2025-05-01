/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { GridPanelData, PanelactivePanel } from '../../types';
import { useGridLayoutContext } from '../../use_grid_layout_context';
import { commitAction, moveAction, startAction, cancelAction } from './state_manager_actions';
import {
  getSensorPosition,
  isMouseEvent,
  isTouchEvent,
  startMouseInteraction,
  startTouchInteraction,
  startKeyboardInteraction,
  isKeyboardEvent,
} from '../sensors';
import { UseractivePanel } from '../types';
import { getNextKeyboardPositionForPanel } from './utils';
import {
  hasPanelInteractionStartedWithKeyboard,
  isLayoutInteractive,
} from '../state_manager_selectors';
/*
 * This hook sets up and manages drag/resize interaction logic for grid panels.
 * It initializes event handlers to start, move, and commit the interaction,
 * ensuring responsive updates to the panel's position and grid layout state.
 * The interaction behavior is dynamic and adapts to the input type (mouse, touch, or keyboard).
 */
export const useGridLayoutPanelEvents = ({
  interactionType,
  sectionId,
  panelId,
}: {
  interactionType: PanelactivePanel['type'];
  sectionId: string;
  panelId: string;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);

  const onStart = useCallback(
    (ev: UseractivePanel) => {
      startAction(ev, gridLayoutStateManager, interactionType, sectionId, panelId);
    },
    [gridLayoutStateManager, interactionType, sectionId, panelId]
  );

  const onEnd = useCallback(() => {
    commitAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onBlur = useCallback(() => {
    const {
      activePanel$: { value: { id, type, targetRow } = {} },
    } = gridLayoutStateManager;
    // make sure the user hasn't started another interaction in the meantime
    if (id === panelId && sectionId === targetRow && type === interactionType) {
      commitAction(gridLayoutStateManager);
    }
  }, [gridLayoutStateManager, panelId, sectionId, interactionType]);

  const onCancel = useCallback(() => {
    cancelAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onMove = useCallback(
    (ev: UseractivePanel) => {
      if (isMouseEvent(ev) || isTouchEvent(ev)) {
        return moveAction(
          ev,
          gridLayoutStateManager,
          getSensorPosition(ev),
          lastRequestedPanelPosition
        );
      } else if (
        isKeyboardEvent(ev) &&
        hasPanelInteractionStartedWithKeyboard(gridLayoutStateManager)
      ) {
        const pointerPixel = getNextKeyboardPositionForPanel(
          ev,
          gridLayoutStateManager,
          getSensorPosition(ev)
        );
        return moveAction(ev, gridLayoutStateManager, pointerPixel, lastRequestedPanelPosition);
      }
    },
    [gridLayoutStateManager]
  );

  const startInteraction = useCallback(
    (e: UseractivePanel) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;
      if (isMouseEvent(e)) {
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
        const isEventActive = gridLayoutStateManager.activePanel$.value !== undefined;
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

  return { startDrag: startInteraction };
};
