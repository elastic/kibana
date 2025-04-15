/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { GridPanelData, PanelInteractionEvent } from '../../types';
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
import { UserInteractionEvent } from '../types';
import { getNextKeyboardPositionForPanel } from './utils';
import {
  hasPanelInteractionStartedWithKeyboard,
  isLayoutInteractive,
} from '../state_manager_selectors';

export interface StartDragParams {
  interactionType: PanelInteractionEvent['type'];
  rowId: string;
  panelId: string;
}
/*
 * This hook sets up and manages drag/resize interaction logic for grid panels.
 * It initializes event handlers to start, move, and commit the interaction,
 * ensuring responsive updates to the panel's position and grid layout state.
 * The interaction behavior is dynamic and adapts to the input type (mouse, touch, or keyboard).
 */
export const useGridLayoutPanelEvents = () => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);

  const onStart = useCallback(
    (ev: UserInteractionEvent, { interactionType, rowId, panelId }: StartDragParams) => {
      console.log('what');
      startAction(ev, gridLayoutStateManager, interactionType, rowId, panelId);
    },
    [gridLayoutStateManager]
  );

  const onEnd = useCallback(() => {
    commitAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onBlur = useCallback(() => {
    // make sure the user hasn't started another interaction in the meantime
    commitAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onCancel = useCallback(() => {
    cancelAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onMove = useCallback(
    (ev: UserInteractionEvent) => {
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

  const startDrag = useCallback(
    (e: UserInteractionEvent, { interactionType, rowId, panelId }: StartDragParams) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;
      if (isMouseEvent(e)) {
        startMouseInteraction({
          e,
          onStart: (e) => {
            console.log('onStart', e);
            return onStart(e, { interactionType, rowId, panelId });
          },
          onMove,
          onEnd,
        });
      } else if (isTouchEvent(e)) {
        startTouchInteraction({
          e,
          onStart: (e) => {
            console.log('onStart', e);
            return onStart(e, { interactionType, rowId, panelId });
          },
          onMove,
          onEnd,
        });
      } else if (isKeyboardEvent(e)) {
        const isEventActive = gridLayoutStateManager.interactionEvent$.value !== undefined;
        startKeyboardInteraction({
          e,
          isEventActive,
          onStart: (e) => {
            console.log('onStart', e);
            return onStart(e, { interactionType, rowId, panelId });
          },
          onMove,
          onEnd,
          onBlur,
          onCancel,
          shouldScrollToEnd: gridLayoutStateManager.interactionEvent$.value?.type === 'resize',
        });
      }
    },
    [gridLayoutStateManager, onStart, onMove, onEnd, onBlur, onCancel]
  );

  return startDrag;
};
