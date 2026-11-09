/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';

import type { ActivePanelEvent, FlexPanelData } from '../../grid_panel';
import { useGridLayoutContext } from '../../use_grid_layout_context';
import {
  getSensorPosition,
  isKeyboardEvent,
  isMouseEvent,
  isTouchEvent,
  startKeyboardInteraction,
  startMouseInteraction,
  startTouchInteraction,
} from '../../../grid/use_grid_layout_events/sensors';
import {
  hasPanelInteractionStartedWithKeyboard,
  isLayoutInteractive,
} from '../state_manager_selectors';
import type { UserInteractionEvent } from '../../../grid/use_grid_layout_events/types';
import type { FlexKeyboardInteraction } from '../../types';
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
  panelId,
}: {
  interactionType: ActivePanelEvent['type'];
  panelId: string;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const lastRequestedPanelPosition = useRef<FlexPanelData | undefined>(undefined);

  // keyboard drags are announced to screen reader users; resizes and pointer drags are not
  const announce = useCallback(
    (type: FlexKeyboardInteraction['type']) => {
      gridLayoutStateManager.keyboardInteraction$.next({ type, panelId });
    },
    [gridLayoutStateManager, panelId]
  );

  const onStart = useCallback(
    (ev: UserInteractionEvent) => {
      // a cancelled interaction restores the layout but not this cache, so clear it for each new interaction
      lastRequestedPanelPosition.current = undefined;
      startAction(ev, interactionType, gridLayoutStateManager, panelId);
      if (interactionType === 'drag' && isKeyboardEvent(ev)) announce('start');
    },
    [gridLayoutStateManager, interactionType, panelId, announce]
  );

  const commitAndAnnounce = useCallback(() => {
    const wasKeyboardDrag =
      interactionType === 'drag' && hasPanelInteractionStartedWithKeyboard(gridLayoutStateManager);
    commitAction(gridLayoutStateManager);
    if (wasKeyboardDrag) announce('end');
  }, [gridLayoutStateManager, interactionType, announce]);

  const onEnd = commitAndAnnounce;

  const onBlur = useCallback(() => {
    // make sure the user hasn't started another interaction in the meantime
    if (gridLayoutStateManager.activePanelEvent$.value?.id === panelId) {
      commitAndAnnounce();
    }
  }, [gridLayoutStateManager, panelId, commitAndAnnounce]);

  const onCancel = useCallback(() => {
    cancelAction(gridLayoutStateManager);
    if (interactionType === 'drag') announce('cancel');
  }, [gridLayoutStateManager, interactionType, announce]);

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
        moveAction(ev, gridLayoutStateManager, pointerPixel, lastRequestedPanelPosition);
        if (interactionType === 'drag') announce('move');
      }
    },
    [gridLayoutStateManager, interactionType, announce]
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
          scrollContainer: gridLayoutStateManager.scrollContainer$.getValue(),
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
