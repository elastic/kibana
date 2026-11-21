/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActivePanelEvent, FlexPanelData } from '../../panel';
import type { FlexLayoutStateManager } from '../../types';
import { KeyboardCode, type UserKeyboardEvent } from '../../../common/sensors/keyboard/types';
import type { PointerPosition } from '../../../common/types';

// A panel can never be resized narrower than this, regardless of `resizeOptions.minWidth`
export const MIN_RESIZE_WIDTH = 50;

export const getDefaultResizeOptions = () => ({
  minWidth: MIN_RESIZE_WIDTH,
  maxWidth: Number.MAX_VALUE,
});

// Width breakpoints that respect the panel's resize limits
export const getAllowedBreakpoints = (
  breakpoints: number[] | undefined,
  resizeOptions: FlexPanelData['resizeOptions']
): number[] => {
  const { minWidth, maxWidth } = { ...getDefaultResizeOptions(), ...resizeOptions };
  return (breakpoints ?? []).filter(
    (breakpoint) => breakpoint >= minWidth && breakpoint <= maxWidth
  );
};

// The narrowest and widest a panel can be committed at, taking width breakpoints into account
export const getEffectiveWidthLimits = (
  breakpoints: number[] | undefined,
  resizeOptions: FlexPanelData['resizeOptions']
): { minWidth: number; maxWidth: number } => {
  const allowed = getAllowedBreakpoints(breakpoints, resizeOptions);
  if (!allowed.length) return { ...getDefaultResizeOptions(), ...resizeOptions };
  return { minWidth: Math.min(...allowed), maxWidth: Math.max(...allowed) };
};

// Calculates the preview rect coordinates for a resized panel
export const getResizePreviewRect = ({
  activePanel,
  pointerPixel,
  resizeOptions,
  usableWidth,
}: {
  pointerPixel: PointerPosition;
  activePanel: ActivePanelEvent;
  resizeOptions: FlexPanelData['resizeOptions'];
  usableWidth: number;
}) => {
  const { top, bottom } = activePanel.panelDiv.getBoundingClientRect();
  // use the left edge from the resize start; the live `left` can change if the panel reflows rows
  const originLeft = activePanel.position.left;
  const { maxWidth, minWidth: requestedMinWidth } = {
    ...getDefaultResizeOptions(),
    ...resizeOptions,
  };
  const minWidth = Math.max(requestedMinWidth, MIN_RESIZE_WIDTH);
  return {
    left: originLeft,
    // panel height is fixed in a flex layout, so only the width changes
    top,
    bottom,
    right: Math.max(
      Math.min(
        pointerPixel.clientX - activePanel.sensorOffsets.right, // actual width based on mouse position
        // max width of panel; limited by the container's usable width rather than the space left on
        // the original row, since the panel wraps onto the next row when it no longer fits
        originLeft + Math.min(maxWidth, usableWidth)
      ),
      originLeft + minWidth // min width of panel
    ),
  };
};

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
  const usableWidth = (gridPosition?.width || window.innerWidth) - gutterSize * 2;
  const stepX = rowHeight + gutterSize; // this acts as a decent guess for how much to resize by
  // step from the last requested edge, since the handle's live position shifts if the panel reflows
  const currentX = activePanel.position.right + activePanel.sensorOffsets.right;

  switch (ev.code) {
    case KeyboardCode.Right:
      // the width is capped by the container's usable width, not by the space left on the original row
      return {
        ...handlePosition,
        clientX: Math.min(
          currentX + stepX,
          activePanel.position.left + usableWidth + activePanel.sensorOffsets.right
        ),
      };
    case KeyboardCode.Left:
      return { ...handlePosition, clientX: Math.max(currentX - stepX, gridLeft) };
    default:
      return { ...handlePosition, clientX: currentX };
  }
};
