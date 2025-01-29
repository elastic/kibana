/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuntimeGridSettings, PanelInteractionEvent, ActivePanel } from '../../../types';
import { KeyboardCode, UserKeyboardEvent } from './types';
import { getGridWidth } from '../../math_utils';

export const getKeyboardDragPreviewRect = ({
  e,
  interactionEvent,
  runtimeSettings,
  activePanel,
}: {
  e: UserKeyboardEvent;
  interactionEvent: PanelInteractionEvent;
  runtimeSettings: RuntimeGridSettings;
  activePanel: ActivePanel | undefined;
}) => {
  const { top, bottom, left, right } = activePanel?.position || interactionEvent.pointerOffsets;
  const currentCoordinates = { top, bottom, left, right };
  const { columnPixelWidth, gutterSize, rowHeight } = runtimeSettings;
  switch (e.code) {
    case KeyboardCode.Right:
      const newLeft = left + columnPixelWidth + gutterSize;
      const newRight = right + columnPixelWidth + gutterSize;
      return {
        ...currentCoordinates,
        left: newLeft,
        right: newRight,
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
  runtimeSettings,
  activePanel,
}: {
  e: UserKeyboardEvent;
  interactionEvent: PanelInteractionEvent;
  runtimeSettings: RuntimeGridSettings;
  activePanel: ActivePanel | undefined;
}) => {
  const { columnPixelWidth, gutterSize, rowHeight } = runtimeSettings;
  const { top, bottom, left, right } = interactionEvent.panelDiv.getBoundingClientRect();
  const currentCoordinates = { top, bottom, left, right };
  console.log(currentCoordinates, getGridWidth(runtimeSettings))
  switch (e.code) {
    case KeyboardCode.Right:
      return {
        ...currentCoordinates,
        right: Math.min(right + columnPixelWidth + gutterSize,  getGridWidth(runtimeSettings)),
      };
    case KeyboardCode.Left:
      return {
        ...currentCoordinates,
        right: Math.min( right - columnPixelWidth - gutterSize, getGridWidth(runtimeSettings)),
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
