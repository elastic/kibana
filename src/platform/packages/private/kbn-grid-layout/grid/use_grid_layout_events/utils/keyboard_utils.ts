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

const OFFSET_TOP = 150; // TODO: Move to runtimeSettings ?
const OFFSET_BOTTOM = 8; // Aesthetic bottom margin

const updateClientY = (
  currentY: number,
  stepY: number,
  isCloseToEdge: boolean,
  type: string | undefined,
  scrollTop: number
) => {
  if (isCloseToEdge && type === 'resize') {
    setTimeout(() => document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }
  if (isCloseToEdge && type === 'drag') {
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
    return currentY;
  }
  return currentY + stepY;
};

export const updateNextPointerPixelForKeyboard = (
  ev: UserKeyboardEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  handlePosition: { clientX: number; clientY: number }
) => {
  const {
    interactionEvent$: { value: interactionEvent },
    activePanel$: { value: activePanel },
    runtimeSettings$: {
      value: { columnPixelWidth, rowHeight, gutterSize },
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
        clientY: updateClientY(
          handlePosition.clientY,
          stepY,
          isCloseToBottom,
          type,
          window.scrollY + stepY
        ),
      };
    }
    case KeyboardCode.Up: {
      // check if next key will cross the top edge
      const isCloseToTop = panelPosition.top - stepY - OFFSET_TOP < 0;

      return {
        ...handlePosition,
        clientY: updateClientY(
          handlePosition.clientY,
          -stepY,
          isCloseToTop,
          type,
          window.scrollY - stepY
        ),
      };
    }
    default:
      return handlePosition;
  }
};
