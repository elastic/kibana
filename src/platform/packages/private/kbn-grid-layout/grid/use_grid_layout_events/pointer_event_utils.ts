/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelInteractionEvent, RuntimeGridSettings } from '../types';
import { getGridWidth } from './math_utils';
import { getPointerPosition, isMouseEvent, isTouchEvent } from './sensors';
import { isKeyboardEvent } from './sensors/keyboard/keyboard';
import { UserInteractionEvent } from './types';

// Calculates the preview rect coordinates for a resized panel
export const getResizePreviewRect = ({
  interactionEvent,
  pointerPixel,
  runtimeSettings,
}: {
  pointerPixel: { clientX: number; clientY: number };
  interactionEvent: PanelInteractionEvent;
  runtimeSettings: RuntimeGridSettings;
}) => {
  const panelRect = interactionEvent.panelDiv.getBoundingClientRect();
  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: pointerPixel.clientY - interactionEvent.pointerOffsets.bottom,
    right: Math.min(
      pointerPixel.clientX - interactionEvent.pointerOffsets.right,
      getGridWidth(runtimeSettings)
    ),
  };
};

// Calculates the preview rect coordinates for a dragged panel
export const getDragPreviewRect = ({
  pointerPixel,
  interactionEvent,
}: {
  pointerPixel: { clientX: number; clientY: number };
  interactionEvent: PanelInteractionEvent;
}) => {
  return {
    left: pointerPixel.clientX - interactionEvent.pointerOffsets.left,
    top: pointerPixel.clientY - interactionEvent.pointerOffsets.top,
    bottom: pointerPixel.clientY - interactionEvent.pointerOffsets.bottom,
    right: pointerPixel.clientX - interactionEvent.pointerOffsets.right,
  };
};

// Calculates the cursor's offset relative to the active panel's edges (top, left, right, bottom).
// This ensures the dragged or resized panel maintains its position under the cursor during the interaction.
export function getPointerOffsets(e: UserInteractionEvent, { top, left, right, bottom }: DOMRect) {
  if (isTouchEvent(e) || isMouseEvent(e)) {
    const { clientX, clientY } = getPointerPosition(e);
    return {
      top: clientY - top,
      left: clientX - left,
      right: clientX - right,
      bottom: clientY - bottom,
    };
  } else if (isKeyboardEvent(e)) {
    return { top, left, right, bottom };
  }
  throw new Error('Invalid event type');
}
