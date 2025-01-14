/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelInteractionEvent, RuntimeGridSettings, UserInteractionEvent } from '../types';
import { isMouseEvent, isTouchEvent } from '../utils/sensors';

export const getResizePreviewRect = (
  interactionEvent: PanelInteractionEvent,
  pointerClientPixel: { x: number; y: number },
  runtimeSettings: RuntimeGridSettings
) => {
  const { columnCount, gutterSize, columnPixelWidth } = runtimeSettings;
  const gridWidth = (gutterSize + columnPixelWidth) * columnCount + gutterSize * 2;

  const panelRect = interactionEvent.panelDiv.getBoundingClientRect();
  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: pointerClientPixel.y - interactionEvent.pointerOffsets.bottom,
    right: Math.min(pointerClientPixel.x - interactionEvent.pointerOffsets.right, gridWidth),
  };
};

export const getDragPreviewRect = (
  interactionEvent: PanelInteractionEvent,
  pointerClientPixel: { x: number; y: number }
) => {
  return {
    left: pointerClientPixel.x - interactionEvent.pointerOffsets.left,
    top: pointerClientPixel.y - interactionEvent.pointerOffsets.top,
    bottom: pointerClientPixel.y - interactionEvent.pointerOffsets.bottom,
    right: pointerClientPixel.x - interactionEvent.pointerOffsets.right,
  };
};

export function getPointerOffsets(e: UserInteractionEvent, panelRect: DOMRect) {
  if (!isMouseEvent(e) && !isTouchEvent(e)) {
    throw new Error('Invalid event type');
  }
  const { clientX, clientY } = isTouchEvent(e) ? e.touches[0] : e;
  return {
    top: clientY - panelRect.top,
    left: clientX - panelRect.left,
    right: clientX - panelRect.right,
    bottom: clientY - panelRect.bottom,
  };
}

export function getPointerPosition(e: Event) {
  if (isMouseEvent(e)) {
    return { x: e.clientX, y: e.clientY };
  }
  if (isTouchEvent(e)) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  throw new Error('Invalid event type');
}
