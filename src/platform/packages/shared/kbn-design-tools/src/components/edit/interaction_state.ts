/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResizeHandle } from '../../lib/constants';

/**
 * Discriminated union representing the current editor interaction.
 * Only one interaction can be active at a time.
 */
export type InteractionState = IdleState | HoverState | DragState | ResizeState;

export interface IdleState {
  readonly type: 'idle';
}

export interface HoverState {
  readonly type: 'hover';
  /** The element (original or clone) being hovered. */
  readonly target: HTMLElement;
  /** The resize handle under the pointer, if any. */
  readonly handle: ResizeHandle | null;
}

export interface DragState {
  readonly type: 'drag';
  /** The original DOM element being dragged. */
  readonly el: HTMLElement;
  /** The visible clone being repositioned. */
  readonly clone: HTMLElement;
  /** Pointer X at drag start. */
  readonly startX: number;
  /** Pointer Y at drag start. */
  readonly startY: number;
  /** Accumulated dx from prior drag/resize before this gesture. */
  readonly baseOffsetX: number;
  /** Accumulated dy from prior drag/resize before this gesture. */
  readonly baseOffsetY: number;
  /** The original element's rect before any editing — used for snap calculations. */
  readonly originalRect: DOMRect;
}

export interface ResizeState {
  readonly type: 'resize';
  /** The original DOM element being resized. */
  readonly el: HTMLElement;
  /** The visible clone being resized. */
  readonly clone: HTMLElement;
  /** Which handle is being dragged. */
  readonly handle: ResizeHandle;
  /** Pointer X at resize start. */
  readonly startX: number;
  /** Pointer Y at resize start. */
  readonly startY: number;
  /** Clone width at resize start (includes any prior dw). */
  readonly baseWidth: number;
  /** Clone height at resize start (includes any prior dh). */
  readonly baseHeight: number;
  /** Position offset at resize start (includes any prior dx). */
  readonly baseDx: number;
  /** Position offset at resize start (includes any prior dy). */
  readonly baseDy: number;
  /** The original element's rect — used for snap calculations. */
  readonly originalRect: DOMRect;
}

export const IDLE: IdleState = { type: 'idle' };
