/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelInteractionEvent } from '../types';
import { getPointerPosition } from './sensors';
import { UserInteractionEvent } from './types';

// Calculates the preview rect coordinates for a resized panel
export const getResizePreviewRect = ({
  interactionEvent,
  pointerPixel,
}: {
  pointerPixel: { clientX: number; clientY: number };
  interactionEvent: PanelInteractionEvent;
}) => {
  const panelRect = interactionEvent.panelDiv.getBoundingClientRect();

  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: pointerPixel.clientY - interactionEvent.pointerOffsets.bottom,
    right: pointerPixel.clientX - interactionEvent.pointerOffsets.right,
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
export function getPointerOffsets(e: UserInteractionEvent, panelRect: DOMRect) {
  const { clientX, clientY } = getPointerPosition(e);
  return {
    top: clientY - panelRect.top,
    left: clientX - panelRect.left,
    right: clientX - panelRect.right,
    bottom: clientY - panelRect.bottom,
  };
}
