/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { EditOverlay } from './edit_overlay';
export { EditOutline, OutlineControls, EditButton, DeleteButton, DuplicateButton } from './outline';
export { EditModal, ElementTree } from './modal';
export { ElementRegistry } from './element_registry';
export { IDLE } from './interaction_state';
export {
  startDragFromElement,
  findManagedSession,
  startDragFromSession,
  applyDragMove,
} from './drag_helpers';
export { createDuplicate } from './duplicate_helpers';
export {
  startResize,
  calcResizeDeltas,
  buildTransform,
  findNearHandle,
  getHandleMode,
  applyResizeMove,
  getHandlePositions,
} from './resize_helpers';

export type { ElementSession } from './element_registry';
export type {
  InteractionState,
  IdleState,
  HoverState,
  DragState,
  ResizeState,
} from './interaction_state';
export type { EditOverlayHandle } from './edit_overlay';
