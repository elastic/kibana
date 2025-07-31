/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiThemeVars } from '@kbn/ui-theme';

import type { ActivePanelEvent } from '../../grid_panel';
import type { GridLayoutStateManager } from '../../types';
import { updateClientY } from '../keyboard_utils';
import { getSensorPosition, isKeyboardEvent, isMouseEvent, isTouchEvent } from '../sensors';
import { KeyboardCode, type UserKeyboardEvent } from '../sensors/keyboard/types';
import type { PointerPosition, UserInteractionEvent } from '../types';

// Calculates the preview rect coordinates for a resized panel
export const getResizePreviewRect = ({
  activePanel,
  pointerPixel,
  maxRight,
}: {
  pointerPixel: PointerPosition;
  activePanel: ActivePanelEvent;
  maxRight: number;
}) => {
  const panelRect = activePanel.panelDiv.getBoundingClientRect();

  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: pointerPixel.clientY - activePanel.sensorOffsets.bottom,
    right: Math.min(pointerPixel.clientX - activePanel.sensorOffsets.right, maxRight),
  };
};

// Calculates the preview rect coordinates for a dragged panel
export const getDragPreviewRect = ({
  pointerPixel,
  activePanel,
}: {
  pointerPixel: PointerPosition;
  activePanel: ActivePanelEvent;
}) => {
  return {
    left: pointerPixel.clientX - activePanel.sensorOffsets.left,
    top: pointerPixel.clientY - activePanel.sensorOffsets.top,
    bottom: pointerPixel.clientY - activePanel.sensorOffsets.bottom,
    right: pointerPixel.clientX - activePanel.sensorOffsets.right,
  };
};

// Calculates the sensor's offset relative to the active panel's edges (top, left, right, bottom).
// This ensures the dragged or resized panel maintains its position under the cursor during the interaction.
export function getSensorOffsets(e: UserInteractionEvent, { top, left, right, bottom }: DOMRect) {
  if (!isTouchEvent(e) && !isMouseEvent(e) && !isKeyboardEvent(e)) {
    throw new Error('Unsupported event type: only mouse, touch, or keyboard events are handled.');
  }
  const { clientX, clientY } = getSensorPosition(e);
  return {
    top: clientY - top,
    left: clientX - left,
    right: clientX - right,
    bottom: clientY - bottom,
  };
}

const KEYBOARD_DRAG_BOTTOM_LIMIT = parseInt(euiThemeVars.euiSizeS, 10);

export const getNextKeyboardPositionForPanel = (
  ev: UserKeyboardEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  handlePosition: { clientX: number; clientY: number }
) => {
  const {
    activePanelEvent$: { value: activePanel },
    runtimeSettings$: {
      value: { columnPixelWidth, rowHeight, gutterSize, keyboardDragTopLimit },
    },
  } = gridLayoutStateManager;

  const { type } = activePanel ?? {};
  const panelPosition = activePanel?.position ?? activePanel?.panelDiv.getBoundingClientRect();

  if (!panelPosition) return handlePosition;

  const stepX = columnPixelWidth + gutterSize;
  const stepY = rowHeight + gutterSize;
  const gridPosition = gridLayoutStateManager.layoutRef.current?.getBoundingClientRect();

  switch (ev.code) {
    case KeyboardCode.Right: {
      // The distance between the handle and the right edge of the panel to ensure the panel stays within the grid boundaries
      const panelHandleDiff = panelPosition.right - handlePosition.clientX;
      const gridPositionRight = (gridPosition?.right || window.innerWidth) - gutterSize;
      const maxRight = type === 'drag' ? gridPositionRight - panelHandleDiff : gridPositionRight;

      return {
        ...handlePosition,
        clientX: Math.min(handlePosition.clientX + stepX, maxRight),
      };
    }
    case KeyboardCode.Left:
      const panelHandleDiff = panelPosition.left - handlePosition.clientX;
      const gridPositionLeft = (gridPosition?.left || 0) + gutterSize;
      const maxLeft = type === 'drag' ? gridPositionLeft - panelHandleDiff : gridPositionLeft;

      return {
        ...handlePosition,
        clientX: Math.max(handlePosition.clientX - stepX, maxLeft),
      };

    case KeyboardCode.Down: {
      // check if we are at the end of the scroll of the page
      const bottomOfPageReached = window.innerHeight + window.scrollY >= document.body.scrollHeight;
      // check if next key will cross the bottom edge
      // if we're at the end of the scroll of the page, the dragged handle can go down even more so we can reorder with the last row
      const bottomMaxPosition = bottomOfPageReached
        ? panelPosition.bottom + stepY - (panelPosition.bottom - panelPosition.top) * 0.5
        : panelPosition.bottom + stepY + KEYBOARD_DRAG_BOTTOM_LIMIT;

      const isCloseToBottom = bottomMaxPosition > window.innerHeight;

      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, stepY, isCloseToBottom, type),
      };
    }
    case KeyboardCode.Up: {
      // check if next key will cross the top edge
      const isCloseToTop = panelPosition.top - stepY - keyboardDragTopLimit < 0;
      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, -stepY, isCloseToTop, type),
      };
    }
    default:
      return handlePosition;
  }
};
