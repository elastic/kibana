/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';

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
  hasRowInteractionStartedWithKeyboard,
  isLayoutInteractive,
} from '../state_manager_selectors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { cancelAction, commitAction, moveAction, startAction } from './state_manager_actions';
import { getNextKeyboardPosition } from './utils';

/*
 * This hook sets up and manages interaction logic for dragging grid sections.
 * It initializes event handlers to start, move, and commit the interaction,
 * ensuring responsive updates to the panel's position and grid layout state.
 * The interaction behavior is dynamic and adapts to the input type (mouse, touch, or keyboard).
 */
export const useGridLayoutSectionEvents = ({ sectionId }: { sectionId: string }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const startingPointer = useRef<PointerPosition>({ clientX: 0, clientY: 0 });

  const onEnd = useCallback(() => commitAction(gridLayoutStateManager), [gridLayoutStateManager]);
  const onCancel = useCallback(
    () => cancelAction(gridLayoutStateManager),
    [gridLayoutStateManager]
  );
  const startInteraction = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) {
        return;
      }
      const onStart = () => {
        startingPointer.current = getSensorPosition(e);
        startAction(e, gridLayoutStateManager, sectionId);
      };

      const onMove = (ev: UserInteractionEvent) => {
        if (isMouseEvent(ev) || isTouchEvent(ev)) {
          moveAction(gridLayoutStateManager, startingPointer.current, getSensorPosition(ev));
        } else if (
          isKeyboardEvent(ev) &&
          hasRowInteractionStartedWithKeyboard(gridLayoutStateManager)
        ) {
          const pointerPixel = getNextKeyboardPosition(
            ev,
            gridLayoutStateManager,
            getSensorPosition(ev),
            sectionId
          );
          moveAction(gridLayoutStateManager, startingPointer.current, pointerPixel);
        }
      };

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
        if (gridLayoutStateManager.activeSectionEvent$.getValue()) return; // interaction has already happened, so don't start again
        startKeyboardInteraction({
          e,
          onStart,
          onMove,
          onEnd,
          onBlur: onEnd,
          onCancel,
        });
      }
    },
    [gridLayoutStateManager, sectionId, onEnd, onCancel]
  );

  return startInteraction;
};
