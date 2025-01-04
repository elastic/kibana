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
import { GridLayoutStateManager, PanelInteractionEvent } from '../types';

export interface DragHandleApi {
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
}

export const DragHandle = React.forwardRef<
  DragHandleApi,
  {
    gridLayoutStateManager: GridLayoutStateManager;
    interactionStart: (
      type: PanelInteractionEvent['type'] | 'drop',
      e: MouseEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => void;
  }
>(({ gridLayoutStateManager, interactionStart }, ref) => {
  const { euiTheme } = useEuiTheme();

  const removeEventListenersRef = useRef<(() => void) | null>(null);
  const [dragHandleCount, setDragHandleCount] = useState<number>(0);
  const dragHandleRefs = useRef<Array<HTMLElement | null>>([]);

  /**
   * We need to memoize the `onMouseDown` callback so that we don't assign a new `onMouseDown` event handler
   * every time `setDragHandles` is called
   */
  const onMouseDown = useCallback(
    (e: MouseEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (gridLayoutStateManager.accessMode$.getValue() !== 'EDIT' || e.button !== 0) {
        // ignore anything but left clicks, and ignore clicks when not in edit mode
        return;
      }
      e.stopPropagation();
      interactionStart('drag', e);
    },
    [interactionStart, gridLayoutStateManager.accessMode$]
  );

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      setDragHandleCount(dragHandles.length);
      dragHandleRefs.current = dragHandles;

      for (const handle of dragHandles) {
        if (handle === null) return;
        handle.addEventListener('mousedown', onMouseDown, { passive: true });
      }

      removeEventListenersRef.current = () => {
        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.removeEventListener('mousedown', onMouseDown);
        }
      };
    },
    [onMouseDown]
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
      onMouseDown={(e) => {
        interactionStart('drag', e);
      }}
      onMouseUp={(e) => {
        interactionStart('drop', e);
      }}
    >
      <EuiIcon type="grabOmnidirectional" />
    </button>
  );
});
