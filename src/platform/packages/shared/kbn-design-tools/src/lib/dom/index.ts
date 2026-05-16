/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getPageColorMode, getPageColorScheme } from './get_page_color_mode';
export type { PageColorScheme } from './get_page_color_mode';
export { resolveColorTokensDeep, isTextToken, isBgToken } from './color_token_lookup';
export { syncTokenStylesheet, removeTokenStylesheet, getTokenVar } from './color_token_stylesheet';
export {
  renderAndCloneEuiComponent,
  renderEuiComponentLive,
  centerInViewport,
} from './insert_element';
export { getContentRoot, isLiveElement } from './managed_element';
export { snapshotComponentState } from './duplicate_helpers';

export type {
  ElementSession,
  StyleEdit,
  TextEdit,
  SourceEdit,
  StyleChange,
  TextNodeChange,
  SourceChange,
} from './element_registry';
export { applyEditChanges } from './element_registry';
export type { PreviewCloneResult } from './create_preview_clone';
export type { TreeNode } from './flatten_element_tree';
export type {
  InteractionState,
  IdleState,
  HoverState,
  DragState,
  ResizeState,
} from './interaction_state';
export type { SpacingLine } from './calculate_spacing';
export type { SnapResult } from './snap_to_grid';
