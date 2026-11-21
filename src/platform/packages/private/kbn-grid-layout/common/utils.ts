/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSensorPosition, isKeyboardEvent, isMouseEvent, isTouchEvent } from './sensors';
import type { PointerPosition, UserInteractionEvent } from './types';

export const nonNullable = <T>(value: T): value is NonNullable<T> =>
  value !== null && value !== undefined;

interface SensorOffsets {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

// Calculates the preview rect coordinates for a dragged panel
export const getDragPreviewRect = ({
  pointerPixel,
  activePanel,
}: {
  pointerPixel: PointerPosition;
  activePanel: { sensorOffsets: SensorOffsets };
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
export const getSensorOffsets = (
  e: UserInteractionEvent,
  { top, left, right, bottom }: DOMRect
): SensorOffsets => {
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
};
