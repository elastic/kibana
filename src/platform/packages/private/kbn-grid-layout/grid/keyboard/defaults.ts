/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KeyboardCode, KeyboardCodes } from './types';

export const keyboardCodes: KeyboardCodes = {
  start: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc, KeyboardCode.Tab],
  end: [KeyboardCode.Space, KeyboardCode.Enter],
  move: [KeyboardCode.Right, KeyboardCode.Left, KeyboardCode.Down, KeyboardCode.Up],
};

export const allKeyCodes = Object.values(keyboardCodes).flat();

export const defaultKeyboardCoordinateGetter = (
  event: KeyboardEvent,
  {
    currentCoordinates,
    runtimeSettings: { columnPixelWidth, gutterSize, rowHeight },
  }: {
    currentCoordinates: { left: number; right: number; top: number; bottom: number };
    runtimeSettings: { columnPixelWidth: number; gutterSize: number; rowHeight: number };
  }
) => {
  switch (event.code) {
    case KeyboardCode.Right:
      return {
        ...currentCoordinates,
        left: currentCoordinates.left + columnPixelWidth + gutterSize,
        right: currentCoordinates.right + columnPixelWidth + gutterSize,
      };
    case KeyboardCode.Left:
      return {
        ...currentCoordinates,
        left: currentCoordinates.left - columnPixelWidth - gutterSize,
        right: currentCoordinates.right - columnPixelWidth - gutterSize,
      };
    case KeyboardCode.Down:
      return {
        ...currentCoordinates,
        top: currentCoordinates.top + rowHeight + gutterSize,
        bottom: currentCoordinates.bottom + rowHeight + gutterSize,
      };
    case KeyboardCode.Up:
      return {
        ...currentCoordinates,
        top: currentCoordinates.top - rowHeight - gutterSize,
        bottom: currentCoordinates.bottom - rowHeight - gutterSize,
      };
  }

  return undefined;
};
