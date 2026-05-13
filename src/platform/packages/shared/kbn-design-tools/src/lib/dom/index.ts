/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { buildHighlightCss } from './build_highlight_css';
export { calculateSpacingLines } from './calculate_spacing';
export { clampToViewport } from './clamp_to_viewport';
export { cloneElement, cloneClean, setImportant, copyStylesDeep } from './clone_element';
export { collectAllTextNodes } from './collect_text_nodes';
export { createPreviewClone } from './create_preview_clone';
export {
  startDragFromElement,
  startDragFromSession,
  findManagedSession,
  applyDragMove,
} from './drag_helpers';
export { createDuplicate } from './duplicate_helpers';
export { ElementRegistry } from './element_registry';
export { flattenElementTree } from './flatten_element_tree';
export { getElementFromPoint } from './get_element_from_point';
export { getElementUnder } from './get_element_under';
export { IDLE, deriveCursor } from './interaction_state';
export { isIgnoredElement } from './is_ignored_element';
export { isTransparentColor } from './is_transparent_color';
export {
  startResize,
  calcResizeDeltas,
  buildTransform,
  findNearHandle,
  getHandleMode,
  applyResizeMove,
  getHandlePositions,
} from './resize_helpers';
export { hasSignificantRounding, isInRoundedDeadZone } from './rounded_dead_zone';
export { resolveHoverTarget } from './resolve_hover_target';
export { snapToGrid } from './snap_to_grid';

export type { SpacingLine } from './calculate_spacing';
export type { PreviewCloneResult } from './create_preview_clone';
export type { ElementSession } from './element_registry';
export type { TreeNode } from './flatten_element_tree';
export type {
  InteractionState,
  IdleState,
  HoverState,
  DragState,
  ResizeState,
} from './interaction_state';
export type { SnapResult } from './snap_to_grid';
