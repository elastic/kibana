/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';

import type { ActivePanelEvent, GridPanelData } from '../../grid_panel';
import { useGridLayoutContext } from '../../use_grid_layout_context';
import {
  getSensorPosition,
  isKeyboardEvent,
  isMouseEvent,
  isTouchEvent,
  startKeyboardInteraction,
  startMouseInteraction,
  startTouchInteraction,
} from '../sensors';
import {
  hasPanelInteractionStartedWithKeyboard,
  isLayoutInteractive,
} from '../state_manager_selectors';
import type { UserInteractionEvent } from '../types';
import { cancelAction, commitAction, moveAction, startAction } from './state_manager_actions';
import { getNextKeyboardPositionForPanel } from './utils';
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
  interactionType: ActivePanelEvent['type'];
  sectionId?: string;
  panelId: string;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);

  const onStart = useCallback(
    (ev: UserInteractionEvent) => {
      if (!sectionId) return;
      startAction(ev, interactionType, gridLayoutStateManager, sectionId, panelId);
    },
    [gridLayoutStateManager, interactionType, sectionId, panelId]
  );

  const onEnd = useCallback(() => {
    commitAction(gridLayoutStateManager);
  }, [gridLayoutStateManager]);

  const onBlur = useCallback(() => {
    const {
      activePanelEvent$: { value: { id, targetSection } = {} },
    } = gridLayoutStateManager;
    // make sure the user hasn't started another interaction in the meantime
    if (id === panelId && sectionId === targetSection) {
      commitAction(gridLayoutStateManager);
    }
  }, [gridLayoutStateManager, panelId, sectionId]);

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

  const startInteraction = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) {
        return;
      }
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
        if (gridLayoutStateManager.activePanelEvent$.getValue()) return; // interaction has already happened, so don't start again
        startKeyboardInteraction({
          e,
          onStart,
          onMove,
          onEnd,
          onBlur,
          onCancel,
        });
      }
    },
    [gridLayoutStateManager, onStart, onMove, onEnd, onBlur, onCancel]
  );

  return startInteraction;
};
