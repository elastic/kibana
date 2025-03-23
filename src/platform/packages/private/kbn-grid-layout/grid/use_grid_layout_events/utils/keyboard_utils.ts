/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutStateManager } from '../../types';
import { KeyboardCode, UserKeyboardEvent } from '../sensors/keyboard/types';

const OFFSET_BOTTOM = 8; // Aesthetic bottom margin

const updateClientY = (currentY: number, stepY: number, isCloseToEdge: boolean, type = 'drag') => {
  if (isCloseToEdge && type === 'resize') {
    setTimeout(() => document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }
  if (isCloseToEdge && type === 'drag') {
    window.scrollTo({ top: window.scrollY + stepY, behavior: 'smooth' });
    return currentY;
  }
  return currentY + stepY;
};

export const getNextPositionForPanel = (
  ev: UserKeyboardEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  handlePosition: { clientX: number; clientY: number }
) => {
  const {
    interactionEvent$: { value: interactionEvent },
    activePanel$: { value: activePanel },
    runtimeSettings$: {
      value: { columnPixelWidth, rowHeight, gutterSize, dragTopOffset },
    },
  } = gridLayoutStateManager;

  const { type } = interactionEvent || {};
  const panelPosition = activePanel?.position || interactionEvent?.panelDiv.getBoundingClientRect();

  if (!panelPosition) return handlePosition;

  const stepX = columnPixelWidth + gutterSize;
  const stepY = rowHeight + gutterSize;
  const gridPosition = gridLayoutStateManager.layoutRef.current?.getBoundingClientRect();

  switch (ev.code) {
    case KeyboardCode.Right: {
      // The distance between the handle and the right edge of the panel to ensure the panel stays within the screen boundaries
      const panelEdgeBuffer = panelPosition.right - handlePosition.clientX;

      return {
        ...handlePosition,
        clientX: Math.min(
          handlePosition.clientX + stepX,
          (gridPosition?.right || window.innerWidth) - panelEdgeBuffer
        ),
      };
    }
    case KeyboardCode.Left:
      return {
        ...handlePosition,
        clientX: Math.max(gridPosition?.left || 0, handlePosition.clientX - stepX),
      };

    case KeyboardCode.Down: {
      // check if next key will cross the bottom edge
      const isCloseToBottom = panelPosition.bottom + stepY + OFFSET_BOTTOM > window.innerHeight;

      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, stepY, isCloseToBottom, type),
      };
    }
    case KeyboardCode.Up: {
      // check if next key will cross the top edge
      const isCloseToTop = panelPosition.top - stepY - dragTopOffset < 0;
      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, -stepY, isCloseToTop, type),
      };
    }
    default:
      return handlePosition;
  }
};

export const getNextPositionForRow = (
  ev: UserKeyboardEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  handlePosition: { clientX: number; clientY: number },
  rowId: string
) => {
  const {
    headerRefs: { current: headerRefs },
    runtimeSettings$: {
      value: { dragTopOffset },
    },
  } = gridLayoutStateManager;

  const headerRef = headerRefs[rowId];
  const headerRefHeight = (headerRef?.getBoundingClientRect().height || 48) * 0.5;
  const stepY = headerRefHeight;

  switch (ev.code) {
    case KeyboardCode.Down: {
      const bottomOfPageReached = window.innerHeight + window.scrollY >= document.body.scrollHeight;

      // check if next key will cross the bottom edge
      // if we're at the bottom of the page, the handle can go down even more so we can reorder with the last row
      const bottomMaxPosition = bottomOfPageReached
        ? handlePosition.clientY + stepY
        : handlePosition.clientY + 2 * stepY;
      const isCloseToBottom = bottomMaxPosition > window.innerHeight;

      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, stepY, isCloseToBottom),
      };
    }
    case KeyboardCode.Up: {
      // check if next key will cross the top edge
      const isCloseToTop = handlePosition.clientY - stepY - dragTopOffset < 0;

      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, -stepY, isCloseToTop),
      };
    }
    default:
      return handlePosition;
  }
};
