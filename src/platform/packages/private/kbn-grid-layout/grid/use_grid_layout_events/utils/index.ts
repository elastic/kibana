/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutStateManager, PanelInteractionEvent } from '../../types';
import { getSensorPosition, isKeyboardEvent, isMouseEvent, isTouchEvent } from '../sensors';
import { UserInteractionEvent, PointerPosition } from '../types';

// Calculates the preview rect coordinates for a resized panel
export const getResizePreviewRect = ({
  interactionEvent,
  pointerPixel,
  maxRight,
}: {
  pointerPixel: PointerPosition;
  interactionEvent: PanelInteractionEvent;
  maxRight: number;
}) => {
  const panelRect = interactionEvent.panelDiv.getBoundingClientRect();

  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: pointerPixel.clientY - interactionEvent.sensorOffsets.bottom,
    right: Math.min(pointerPixel.clientX - interactionEvent.sensorOffsets.right, maxRight),
  };
};

// Calculates the preview rect coordinates for a dragged panel
export const getDragPreviewRect = ({
  pointerPixel,
  interactionEvent,
}: {
  pointerPixel: PointerPosition;
  interactionEvent: PanelInteractionEvent;
}) => {
  return {
    left: pointerPixel.clientX - interactionEvent.sensorOffsets.left,
    top: pointerPixel.clientY - interactionEvent.sensorOffsets.top,
    bottom: pointerPixel.clientY - interactionEvent.sensorOffsets.bottom,
    right: pointerPixel.clientX - interactionEvent.sensorOffsets.right,
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

export const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};
