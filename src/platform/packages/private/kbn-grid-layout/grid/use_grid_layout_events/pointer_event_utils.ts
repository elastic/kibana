/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelInteractionEvent, RuntimeGridSettings, UserInteractionEvent } from '../types';
import { getPointerPosition } from './sensors';

export const getResizePreviewRect = (
  interactionEvent: PanelInteractionEvent,
  pointerPixel: { clientX: number; clientY: number },
  runtimeSettings: RuntimeGridSettings
) => {
  const { columnCount, gutterSize, columnPixelWidth } = runtimeSettings;
  const gridWidth = (gutterSize + columnPixelWidth) * columnCount + gutterSize * 2;

  const panelRect = interactionEvent.panelDiv.getBoundingClientRect();
  return {
    left: panelRect.left,
    top: panelRect.top,
    bottom: pointerPixel.clientY - interactionEvent.pointerOffsets.bottom,
    right: Math.min(pointerPixel.clientX - interactionEvent.pointerOffsets.right, gridWidth),
  };
};

export const getDragPreviewRect = (
  interactionEvent: PanelInteractionEvent,
  pointerPixel: { clientX: number; clientY: number }
) => {
  return {
    left: pointerPixel.clientX - interactionEvent.pointerOffsets.left,
    top: pointerPixel.clientY - interactionEvent.pointerOffsets.top,
    bottom: pointerPixel.clientY - interactionEvent.pointerOffsets.bottom,
    right: pointerPixel.clientX - interactionEvent.pointerOffsets.right,
  };
};

export function getPointerOffsets(e: UserInteractionEvent, panelRect: DOMRect) {
  const { clientX, clientY } = getPointerPosition(e);
  return {
    top: clientY - panelRect.top,
    left: clientX - panelRect.left,
    right: clientX - panelRect.right,
    bottom: clientY - panelRect.bottom,
  };
}
