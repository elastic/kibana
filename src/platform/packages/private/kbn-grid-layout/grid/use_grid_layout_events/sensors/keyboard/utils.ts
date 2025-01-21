/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuntimeGridSettings, PanelInteractionEvent } from '../../../types';
import { KeyboardCode, UserKeyboardEvent } from './types';

export const getKeyboardDragPreviewRect = ({
  e,
  interactionEvent,
  runtimeSettings: { columnPixelWidth, gutterSize, rowHeight },
}: {
  e: UserKeyboardEvent;
  interactionEvent: PanelInteractionEvent;
  runtimeSettings: RuntimeGridSettings;
}) => {
  const { top, bottom, left, right } = interactionEvent.panelDiv.getBoundingClientRect();
  const currentCoordinates = { top, bottom, left, right };
  switch (e.code) {
    case KeyboardCode.Right:
      return {
        ...currentCoordinates,
        left: left + columnPixelWidth + gutterSize,
        right: right + columnPixelWidth + gutterSize,
      };
    case KeyboardCode.Left:
      return {
        ...currentCoordinates,
        left: left - columnPixelWidth - gutterSize,
        right: right - columnPixelWidth - gutterSize,
      };
    case KeyboardCode.Down:
      return {
        ...currentCoordinates,
        top: top + rowHeight + gutterSize,
        bottom: bottom + rowHeight + gutterSize,
      };
    case KeyboardCode.Up:
      return {
        ...currentCoordinates,
        top: top - rowHeight - gutterSize,
        bottom: bottom - rowHeight - gutterSize,
      };
  }
  return currentCoordinates;
};

export const getKeyboardResizePreviewRect = ({
  e,
  interactionEvent,
  runtimeSettings: { columnPixelWidth, gutterSize, rowHeight },
}: {
  e: UserKeyboardEvent;
  interactionEvent: PanelInteractionEvent;
  runtimeSettings: RuntimeGridSettings;
}) => {
  const { top, bottom, left, right } = interactionEvent.panelDiv.getBoundingClientRect();
  const currentCoordinates = { top, bottom, left, right };
  switch (e.code) {
    case KeyboardCode.Right:
      return {
        ...currentCoordinates,
        right: right + columnPixelWidth + gutterSize,
      };
    case KeyboardCode.Left:
      return {
        ...currentCoordinates,
        right: right - columnPixelWidth - gutterSize,
      };
    case KeyboardCode.Down:
      return {
        ...currentCoordinates,
        bottom: bottom + rowHeight + gutterSize,
      };
    case KeyboardCode.Up:
      return {
        ...currentCoordinates,
        bottom: bottom - rowHeight - gutterSize,
      };
  }
  return currentCoordinates;
};
