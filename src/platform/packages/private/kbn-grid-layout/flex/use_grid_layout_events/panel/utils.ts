/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiThemeVars } from '@kbn/ui-theme';
import { getScrollDimensions, isAtBottomOfPage } from '@kbn/core-chrome-layout-utils';

import type { ActivePanelEvent, FlexPanelData } from '../../grid_panel';
import type { FlexLayoutStateManager, GridSettings } from '../../types';
import { updateClientY } from '../../../grid/use_grid_layout_events/keyboard_utils';
import {
  getSensorPosition,
  isKeyboardEvent,
  isMouseEvent,
  isTouchEvent,
} from '../../../grid/use_grid_layout_events/sensors';
import {
  KeyboardCode,
  type UserKeyboardEvent,
} from '../../../grid/use_grid_layout_events/sensors/keyboard/types';
import type {
  PointerPosition,
  UserInteractionEvent,
} from '../../../grid/use_grid_layout_events/types';

export const getDefaultResizeOptions = () => ({
  minWidth: 1,
  maxWidth: Number.MAX_VALUE,
  minHeight: 1,
  maxHeight: Number.MAX_VALUE,
});

export const getRowCountInPixels = ({
  rowCount,
  gridSettings,
}: {
  rowCount: number;
  gridSettings: GridSettings;
}) => {
  const safeRowCount = Math.min(rowCount, Number.MAX_VALUE); // Infinity * 0 = Nan which can cause problems.
  return safeRowCount * gridSettings.rowHeight + (safeRowCount - 1) * gridSettings.gutterSize;
};

// Calculates the preview rect coordinates for a resized panel
export const getResizePreviewRect = ({
  activePanel,
  pointerPixel,
  gridSettings,
  resizeOptions,
  maxRight,
}: {
  pointerPixel: PointerPosition;
  activePanel: ActivePanelEvent;
  gridSettings: GridSettings;
  resizeOptions: FlexPanelData['resizeOptions'];
  maxRight: number;
}) => {
  const panelRect = activePanel.panelDiv.getBoundingClientRect();
  const { minWidth, maxWidth, minHeight, maxHeight } = {
    ...getDefaultResizeOptions(),
    ...resizeOptions,
  };
  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: Math.max(
      Math.min(
        pointerPixel.clientY - activePanel.sensorOffsets.bottom, // actual height based on mouse position
        panelRect.top + getRowCountInPixels({ rowCount: maxHeight, gridSettings }) // max height of panel
      ),
      panelRect.top + getRowCountInPixels({ rowCount: minHeight, gridSettings }) // min height of panel
    ),
    right: Math.max(
      Math.min(
        pointerPixel.clientX - activePanel.sensorOffsets.right, // actual width based on mouse position
        panelRect.left + maxWidth, // max width of panel
        // cannot extend width past the right edge of the grid layout
        maxRight
      ),
      panelRect.left + minWidth // min width of panel
    ),
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
  gridLayoutStateManager: FlexLayoutStateManager,
  handlePosition: { clientX: number; clientY: number }
) => {
  const {
    gridLayout$,
    panelRefs: { current: panelElements },
    activePanelEvent$: { value: activePanel },
    gridSettings$: {
      value: { rowHeight, gutterSize },
    },
  } = gridLayoutStateManager;

  const { type } = activePanel ?? {};
  const panelPosition = activePanel?.position ?? activePanel?.panelDiv.getBoundingClientRect();

  if (!activePanel || !panelPosition) return handlePosition;

  const layout = gridLayout$.getValue();
  const gridPosition = gridLayoutStateManager.layoutRef.current?.getBoundingClientRect();

  const stepY = rowHeight + gutterSize;
  // skip past the neighbouring panel (by order) in the given direction
  const getStepX = (direction: 'left' | 'right'): number => {
    const { order } = layout[activePanel.id];
    const neighbourOrder = direction === 'left' ? order - 1 : order + 1;

    const neighbourId = Object.keys(layout).find(
      (id) => id !== activePanel.id && layout[id].order === neighbourOrder
    );
    const neighbourWidth = neighbourId
      ? panelElements[neighbourId]?.getBoundingClientRect().width
      : undefined;

    return (neighbourWidth ?? panelPosition.right - panelPosition.left) + gutterSize;
  };

  switch (ev.code) {
    case KeyboardCode.Right: {
      // The distance between the handle and the right edge of the panel to ensure the panel stays within the grid boundaries
      const panelHandleDiff = panelPosition.right - handlePosition.clientX;
      const gridPositionRight = (gridPosition?.right || window.innerWidth) - gutterSize;
      const maxRight = type === 'drag' ? gridPositionRight - panelHandleDiff : gridPositionRight;

      return {
        ...handlePosition,
        clientX: Math.min(handlePosition.clientX + getStepX('right'), maxRight),
      };
    }
    case KeyboardCode.Left:
      const panelHandleDiff = panelPosition.left - handlePosition.clientX;
      const gridPositionLeft = (gridPosition?.left || 0) + gutterSize;
      const maxLeft = type === 'drag' ? gridPositionLeft - panelHandleDiff : gridPositionLeft;

      return {
        ...handlePosition,
        clientX: Math.max(handlePosition.clientX - getStepX('left'), maxLeft),
      };

    case KeyboardCode.Down: {
      const isCloseToBottom =
        panelPosition.bottom + stepY > (gridPosition?.bottom ?? Infinity) - gutterSize;
      return {
        ...handlePosition,
        clientY: isCloseToBottom ? handlePosition.clientY : handlePosition.clientY + stepY,
      };
    }
    case KeyboardCode.Up: {
      const isCloseToTop = panelPosition.top - stepY < (gridPosition?.top ?? Infinity) - gutterSize;
      return {
        ...handlePosition,
        clientY: isCloseToTop ? handlePosition.clientY : handlePosition.clientY - stepY,
      };
    }
    default:
      return handlePosition;
  }
};
