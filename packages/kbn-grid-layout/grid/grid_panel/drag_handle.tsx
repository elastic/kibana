/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  GridLayoutStateManager,
  GridPanelData,
  PanelInteractionEvent,
  UserInteractionEvent,
  UserMouseEvent,
  UserTouchEvent,
} from '../types';
import { isMouseEvent, isTouchEvent } from '../utils/sensors';
import { calculateUserEvent, getPointerClientPosition } from '../use_grid_layout_events';

export interface DragHandleApi {
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
}

export const DragHandle = React.forwardRef<
  DragHandleApi,
  {
    gridLayoutStateManager: GridLayoutStateManager;
    interactionStart: (
      type: PanelInteractionEvent['type'] | 'drop',
      e: UserInteractionEvent
    ) => void;
  }
>(({ gridLayoutStateManager, interactionStart }, ref) => {
  const { euiTheme } = useEuiTheme();

  const pointerClientPosition = useRef({ x: 0, y: 0 });
  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);

  const removeEventListenersRef = useRef<(() => void) | null>(null);
  const [dragHandleCount, setDragHandleCount] = useState<number>(0);
  const dragHandleRefs = useRef<Array<HTMLElement | null>>([]);

  const onPointerMove = useCallback(
    (e: UserTouchEvent) => {
      // Note: When an item is being interacted with, `mousemove` events continue to be fired, even when the
      // mouse moves out of the window (i.e. when a panel is being dragged around outside the window).
      if (!isTouchEvent(e)) {
        return;
      }
      pointerClientPosition.current = getPointerClientPosition(e);
      e.preventDefault();
      e.stopPropagation();
      calculateUserEvent(e, gridLayoutStateManager, {
        pointerClientPosition,
        lastRequestedPanelPosition,
      });
    },
    [gridLayoutStateManager]
  );

  const onDragEnd = useCallback(
    (e: UserTouchEvent | UserMouseEvent) => {
      interactionStart('drop', e);
    },
    [interactionStart]
  );

  /**
   * We need to memoize the `onDragStart`, `onTouchStart` and `onTouchEnd` callbacks so that we don't assign a new event handler
   * every time `setDragHandles` is called
   */
  const onDragStart = useCallback(
    (e: UserMouseEvent | UserTouchEvent) => {
      // ignore when not in edit mode
      if (gridLayoutStateManager.accessMode$.getValue() !== 'EDIT') return;

      if (isTouchEvent(e) && e.target) {
        const onTouchEnd = () => {
          onDragEnd(e);
          if (!e.target) return;
          e.target.removeEventListener('touchmove', onPointerMove);
          e.target.removeEventListener('touchend', onTouchEnd);
        };
        e.target.addEventListener('touchmove', onPointerMove);
        e.target.addEventListener('touchend', onTouchEnd);
      }

      // ignore anything but left clicks for mouse events
      if (isMouseEvent(e) && e.button !== 0) {
        return;
      }
      // ignore multi-touch events for touch events
      if (isTouchEvent(e) && e.touches.length > 1) {
        return;
      }
      e.stopPropagation();
      interactionStart('drag', e);
    },
    [interactionStart, onDragEnd, gridLayoutStateManager.accessMode$, onPointerMove]
  );

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      if (gridLayoutStateManager.accessMode$.getValue() !== 'EDIT') {
        return;
      }
      setDragHandleCount(dragHandles.length);
      dragHandleRefs.current = dragHandles;

      for (const handle of dragHandles) {
        if (handle === null) return;
        handle.addEventListener('mousedown', onDragStart, { passive: true });
        handle.addEventListener('touchstart', onDragStart, { passive: false });
      }

      removeEventListenersRef.current = () => {
        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.removeEventListener('mousedown', onDragStart);
          handle.removeEventListener('touchstart', onDragStart);
        }
      };
    },
    [onDragStart, gridLayoutStateManager.accessMode$]
  );

  useEffect(() => {
    return () => {
      // on unmount, remove all drag handle event listeners
      if (removeEventListenersRef.current) {
        removeEventListenersRef.current();
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    () => {
      return { setDragHandles };
    },
    [setDragHandles]
  );

  return Boolean(dragHandleCount) ? null : (
    <button
      aria-label={i18n.translate('kbnGridLayout.dragHandle.ariaLabel', {
        defaultMessage: 'Drag to move',
      })}
      className="kbnGridPanel__dragHandle"
      css={css`
        opacity: 0;
        display: flex;
        cursor: move;
        position: absolute;
        align-items: center;
        justify-content: center;
        top: -${euiTheme.size.l};
        width: ${euiTheme.size.l};
        height: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.modal};
        margin-left: ${euiTheme.size.s};
        border: 1px solid ${euiTheme.border.color};
        border-bottom: none;
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-radius: ${euiTheme.border.radius} ${euiTheme.border.radius} 0 0;
        cursor: grab;
        transition: ${euiTheme.animation.slow} opacity;
        .kbnGridPanel:hover &,
        .kbnGridPanel:focus-within &,
        &:active,
        &:focus {
          opacity: 1 !important;
        }
        &:active {
          cursor: grabbing;
        }
        .kbnGrid--static & {
          display: none;
        }
      `}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
      onTouchStart={onDragStart}
    >
      <EuiIcon type="grabOmnidirectional" />
    </button>
  );
});
