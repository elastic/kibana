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
  PanelInteractionEvent,
  UserInteractionEvent,
  UserMouseEvent,
  UserTouchEvent,
} from '../types';
import { isMouseEvent, isTouchEvent } from '../utils/sensors';

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

  const removeEventListenersRef = useRef<(() => void) | null>(null);
  const [dragHandleCount, setDragHandleCount] = useState<number>(0);
  const dragHandleRefs = useRef<Array<HTMLElement | null>>([]);

  /**
   * We need to memoize the `onDragStart` and `onDragEnd` callbacks so that we don't assign a new event handler
   * every time `setDragHandles` is called
   */
  const onDragStart = useCallback(
    (e: UserMouseEvent | UserTouchEvent) => {
      // ignore when not in edit mode
      if (gridLayoutStateManager.accessMode$.getValue() !== 'EDIT') return;

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
    [interactionStart, gridLayoutStateManager.accessMode$]
  );

  const onDragEnd = useCallback(
    (e: UserTouchEvent | UserMouseEvent) => {
      e.stopPropagation();
      interactionStart('drop', e);
    },
    [interactionStart]
  );

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      setDragHandleCount(dragHandles.length);
      dragHandleRefs.current = dragHandles;

      for (const handle of dragHandles) {
        if (handle === null) return;
        handle.addEventListener('mousedown', onDragStart, { passive: true });
        handle.addEventListener('touchstart', onDragStart, { passive: false });
        handle.addEventListener('touchend', onDragEnd, { passive: true });
      }

      removeEventListenersRef.current = () => {
        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.removeEventListener('mousedown', onDragStart);
          handle.removeEventListener('touchstart', onDragStart);
          handle.removeEventListener('touchend', onDragEnd);
        }
      };
    },
    [onDragStart, onDragEnd]
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
        .kbnGrid--static &,
        .kbnGridPanel--expanded & {
          display: none;
        }
      `}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
      onTouchStart={onDragStart}
      onTouchEnd={onDragEnd}
    >
      <EuiIcon type="grabOmnidirectional" />
    </button>
  );
});
