/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActivePanelEvent, FlexPanelData } from '../../grid_panel';
import type { FlexLayoutStateManager, GridSettings } from '../../types';
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

// A panel can never be resized narrower than this, regardless of `resizeOptions.minWidth`
export const MIN_RESIZE_WIDTH = 50;

export const getDefaultResizeOptions = () => ({
  minWidth: MIN_RESIZE_WIDTH,
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
  // use the left edge from the resize start; the live `left` can change if the panel reflows rows
  const originLeft = activePanel.position.left;
  const { maxWidth, minHeight, maxHeight, ...widthOptions } = {
    ...getDefaultResizeOptions(),
    ...resizeOptions,
  };
  const minWidth = Math.max(widthOptions.minWidth, MIN_RESIZE_WIDTH);
  return {
    left: originLeft,
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
        originLeft + maxWidth, // max width of panel
        // cannot extend width past the right edge of the grid layout
        maxRight
      ),
      originLeft + minWidth // min width of panel
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

type PanelRect = Pick<DOMRect, 'top' | 'left' | 'right'>;

// Calculates the updated index of a keyboard-dragged panel or its current index if it can't
export const getKeyboardDragPosition = ({
  code,
  ids,
  activeId,
  getRect,
  rowHeight,
}: {
  code: string;
  ids: string[];
  activeId: string;
  getRect: (id: string) => PanelRect | undefined;
  rowHeight: number;
}): number => {
  const activeIndex = ids.indexOf(activeId);
  if (activeIndex === -1) return activeIndex;

  switch (code) {
    case KeyboardCode.Left:
      return Math.max(activeIndex - 1, 0);
    case KeyboardCode.Right:
      return Math.min(activeIndex + 1, ids.length - 1);
    case KeyboardCode.Up:
    case KeyboardCode.Down: {
      const isUp = code === KeyboardCode.Up;
      const activeRect = getRect(activeId);
      if (!activeRect) return activeIndex;

      const tolerance = rowHeight / 2;
      const candidates = ids.flatMap((id) => {
        const rect = id === activeId ? undefined : getRect(id);
        if (!rect) return [];
        const isInDirection = isUp
          ? rect.top < activeRect.top - tolerance
          : rect.top > activeRect.top + tolerance;
        return isInDirection ? [{ id, rect }] : [];
      });
      if (!candidates.length) return activeIndex;

      // only consider the nearest row in that direction...
      const tops = candidates.map(({ rect }) => rect.top);
      const nearestTop = isUp ? Math.max(...tops) : Math.min(...tops);
      const centerX = (activeRect.left + activeRect.right) / 2;
      const distance = ({ rect }: { rect: PanelRect }) =>
        Math.abs((rect.left + rect.right) / 2 - centerX);
      // ...and within it, the panel closest horizontally
      const [target] = candidates
        .filter(({ rect }) => Math.abs(rect.top - nearestTop) < tolerance)
        .sort((a, b) => distance(a) - distance(b));
      return ids.indexOf(target.id);
    }
    default:
      return activeIndex;
  }
};

// Moves the resize handle horizontally via keyboard by a fixed step
export const getNextKeyboardResizePosition = (
  ev: UserKeyboardEvent,
  gridLayoutStateManager: FlexLayoutStateManager,
  activePanel: ActivePanelEvent,
  handlePosition: { clientX: number; clientY: number }
) => {
  const {
    gridSettings$: {
      value: { rowHeight, gutterSize },
    },
  } = gridLayoutStateManager;

  const gridPosition = gridLayoutStateManager.layoutRef.current?.getBoundingClientRect();
  const gridLeft = (gridPosition?.left || 0) + gutterSize;
  const gridRight = (gridPosition?.right || window.innerWidth) - gutterSize;
  const stepX = rowHeight + gutterSize; // this acts as a decent guess for how much to resize by
  // step from the last requested edge, since the handle's live position shifts if the panel reflows
  const currentX = activePanel.position.right + activePanel.sensorOffsets.right;

  switch (ev.code) {
    case KeyboardCode.Right:
      return { ...handlePosition, clientX: Math.min(currentX + stepX, gridRight) };
    case KeyboardCode.Left:
      return { ...handlePosition, clientX: Math.max(currentX - stepX, gridLeft) };
    default:
      return handlePosition;
  }
};
