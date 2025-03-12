/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutStateManager } from '../../types';
import { UserInteractionEvent } from '../types';
import { isMouseEvent } from './mouse';
import { isTouchEvent } from './touch';

export { isMouseEvent, startMouseInteraction } from './mouse';
export { isTouchEvent, startTouchInteraction } from './touch';

export function getPointerPosition(e: UserInteractionEvent) {
  if (!isMouseEvent(e) && !isTouchEvent(e)) {
    throw new Error('Invalid event type');
  }
  return isTouchEvent(e) ? e.touches[0] : e;
}

export const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};
