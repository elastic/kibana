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
import { cancelAction, commitAction, moveAction, startAction } from './row_state_manager_actions';
import {
  getSensorPosition,
  isKeyboardEvent,
  isMouseEvent,
  isTouchEvent,
  startKeyboardInteraction,
  startMouseInteraction,
  startTouchInteraction,
} from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { isLayoutInteractive } from '../state_manager_selectors';
import { getNextKeyboardPosition } from './utils';

/*
 * This hook sets up and manages interaction logic for dragging grid rows.
 * It initializes event handlers to start, move, and commit the interaction,
 * ensuring responsive updates to the panel's position and grid layout state.
 * The interaction behavior is dynamic and adapts to the input type (mouse or touch).
 */
export const useGridLayoutRowEvents = ({ rowId }: { rowId: string }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const pointerPixel = useRef<PointerPosition>({ clientX: 0, clientY: 0 });
  const startingPointer = useRef<PointerPosition>({ clientX: 0, clientY: 0 });

  const onEnd = useCallback(() => commitAction(gridLayoutStateManager), [gridLayoutStateManager]);
  const onCancel = useCallback(
    () => cancelAction(gridLayoutStateManager),
    [gridLayoutStateManager]
  );
  const startInteraction = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;
      pointerPixel.current = getSensorPosition(e);
      const onStart = () => startAction(e, gridLayoutStateManager, rowId, startingPointer);

      const onMove = (ev: UserInteractionEvent) => {
        if (isMouseEvent(ev) || isTouchEvent(ev)) {
          pointerPixel.current = getSensorPosition(ev);
        } else if (isKeyboardEvent(ev)) {
          pointerPixel.current = getNextKeyboardPosition(
            ev,
            gridLayoutStateManager,
            pointerPixel.current,
            rowId
          );
        }
        moveAction(gridLayoutStateManager, startingPointer.current, pointerPixel.current);
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
        const isEventActive = gridLayoutStateManager.activeRowEvent$.value !== undefined;
        startKeyboardInteraction({
          e,
          isEventActive,
          onStart,
          onMove,
          onEnd,
          onCancel,
        });
      }
    },
    [gridLayoutStateManager, rowId, onEnd, onCancel]
  );

  return { startDrag: startInteraction, onBlur: onEnd };
};
