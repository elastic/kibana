/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  MEASURE_OVERLAY_ID,
  MOVE_OVERLAY_ID,
  GRID_OVERLAY_ID,
  GRID_SETTINGS_FLYOUT_ID,
  DEVELOPER_TOOLBAR_ID,
  ENDPOINT_SIZE,
} from './constants';
export { isIgnoredElement } from './dom/is_ignored_element';
export { isEscapeKey, isMeasureShortcut } from './keyboard_shortcut';

export { calculateSpacingLines } from './dom';
export type { SpacingLine } from './dom';
export { getElementFromPoint } from './dom';
export { handleEventPropagation } from './dom';
