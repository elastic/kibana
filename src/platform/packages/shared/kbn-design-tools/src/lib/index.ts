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
  LAYOUT_POPOVER_ID,
  EDIT_MODAL_ID,
  DEVELOPER_TOOLBAR_ID,
  DEVTOOL_MANAGED_ATTR,
  DEVTOOL_HIDDEN_ATTR,
  DEVTOOL_IGNORE_ATTR,
  DEVTOOL_RESIZE_HANDLE_ATTR,
  ENDPOINT_SIZE,
  HANDLE_CURSORS,
  LABEL_PADDING,
  RESIZE_HANDLE_SIZE,
  ALL_HANDLES,
  MIN_HANDLE_DIM,
  FULL_HANDLE_DIM,
  NON_DELETABLE_TAGS,
  TRUNCATION_CLASSES,
  IGNORED_CLASS_LABELS,
  IGNORED_CLASS_PREFIXES,
  CONTROLS_HEIGHT,
  LOCK_PADDING,
  DUPLICATE_OFFSET,
  ROUNDING_THRESHOLD,
  EDGE_ZONE,
  SVG_INTERNALS,
  TRANSPARENT_COLOR_RE,
  INHERITED_CSS_PROPS,
  NON_INHERITED_VISUAL_CSS_PROPS,
  BACKGROUND_CSS_PROPS,
  MANAGED_ELEMENT_SELECTOR,
  DEVTOOL_IGNORE_SELECTOR,
  DEVTOOL_RESIZE_SELECTOR,
  IGNORED_ELEMENT_IDS,
  IGNORED_SELECTOR,
} from './constants';
export type { ResizeHandle } from './constants';
export { isEscapeKey, isDeleteKey, isMeasureShortcut } from './keyboard_shortcuts';

export { EUI_COMPONENTS, resolveEuiTag, resolveReactComponentName, resolveTag } from './fiber';

export {
  buildHighlightCss,
  calculateSpacingLines,
  clampToViewport,
  cloneElement,
  cloneClean,
  setImportant,
  copyStylesDeep,
  collectAllTextNodes,
  createPreviewClone,
  startDragFromElement,
  startDragFromSession,
  findManagedSession,
  applyDragMove,
  createDuplicate,
  ElementRegistry,
  flattenElementTree,
  getElementFromPoint,
  getElementUnder,
  handleEventPropagation,
  IDLE,
  deriveCursor,
  isIgnoredElement,
  isTransparentColor,
  startResize,
  calcResizeDeltas,
  buildTransform,
  findNearHandle,
  getHandleMode,
  applyResizeMove,
  getHandlePositions,
  hasSignificantRounding,
  isInRoundedDeadZone,
  snapToGrid,
} from './dom';

export type {
  SpacingLine,
  PreviewCloneResult,
  ElementSession,
  TreeNode,
  InteractionState,
  IdleState,
  HoverState,
  DragState,
  ResizeState,
  SnapResult,
} from './dom';

export { getDefaultLayoutConfig, calculateColumnLayout, calculateRowLayout } from './layout';

export type {
  LayoutConfig,
  LayoutType,
  LayoutAlignType,
  LayoutRowAlignType,
  ColumnLayout,
  RowLayout,
} from './layout';
