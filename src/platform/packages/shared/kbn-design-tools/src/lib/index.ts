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
  EDIT_OVERLAY_ID,
  LAYOUT_OVERLAY_ID,
  LAYOUT_SETTINGS_FLYOUT_ID,
  DEVELOPER_TOOLBAR_ID,
  DEVTOOL_CLONE_ATTR,
  DEVTOOL_IGNORE_ATTR,
  DEVTOOL_RESIZE_HANDLE_ATTR,
  ENDPOINT_SIZE,
  HANDLE_CURSORS,
  LABEL_PADDING,
  RESIZE_HANDLE_SIZE,
} from './constants';
export type { ResizeHandle } from './constants';
export { isEscapeKey, isMeasureShortcut } from './keyboard_shortcut';

export {
  isIgnoredElement,
  calculateSpacingLines,
  clampToViewport,
  cloneElement,
  getElementFromPoint,
  getElementUnder,
  handleEventPropagation,
  snapToGrid,
} from './dom';

export type { SpacingLine, ElementOffset, SnapResult } from './dom';

export { getDefaultLayoutConfig, calculateColumnLayout, calculateRowLayout } from './layout';

export type {
  LayoutConfig,
  LayoutType,
  LayoutAlignType,
  LayoutRowAlignType,
  ColumnLayout,
  RowLayout,
} from './layout';
