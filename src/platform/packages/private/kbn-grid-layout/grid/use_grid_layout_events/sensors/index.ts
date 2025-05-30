/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserInteractionEvent } from '../types';
import { isKeyboardEvent, getElementPosition } from './keyboard';
import { isMouseEvent, getMouseSensorPosition } from './mouse';
import { isTouchEvent, getTouchSensorPosition } from './touch';

export { isMouseEvent, startMouseInteraction } from './mouse';
export { isTouchEvent, startTouchInteraction } from './touch';
export { isKeyboardEvent, startKeyboardInteraction } from './keyboard';

export function getSensorPosition(e: UserInteractionEvent) {
  if (isMouseEvent(e)) {
    return getMouseSensorPosition(e);
  } else if (isTouchEvent(e)) {
    return getTouchSensorPosition(e);
  } else if (isKeyboardEvent(e) && e.target instanceof HTMLElement) {
    return getElementPosition(e.target);
  }
  throw new Error('Invalid event type');
}

export function getSensorType(e: UserInteractionEvent) {
  if (isMouseEvent(e)) {
    return 'mouse';
  } else if (isTouchEvent(e)) {
    return 'touch';
  } else if (isKeyboardEvent(e)) {
    return 'keyboard';
  }
  throw new Error('Invalid event type');
}
