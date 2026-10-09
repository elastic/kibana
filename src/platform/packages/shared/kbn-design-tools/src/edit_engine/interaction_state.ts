/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResizeHandle } from '../lib/constants';
import { HANDLE_CURSORS } from '../lib/constants';
import type { ElementSession } from './element_registry';

/**
 * Discriminated union representing the current editor interaction.
 * Only one interaction can be active at a time.
 */
export type InteractionState = IdleState | HoverState | PendingDragState | DragState | ResizeState;

interface IdleState {
  readonly type: 'idle';
}

interface HoverState {
  readonly type: 'hover';
  /** The element being hovered. */
  readonly target: HTMLElement;
  /** The resize handle under the pointer, if any. */
  readonly handle: ResizeHandle | null;
}

/**
 * Pointer is down but hasn't moved enough to commit to a drag.
 * If the pointer is released before exceeding the threshold, no drag occurs.
 */
interface PendingDragState {
  readonly type: 'pending-drag';
  /** The element the user pressed on. */
  readonly target: HTMLElement;
  /** Pointer X at press. */
  readonly startX: number;
  /** Pointer Y at press. */
  readonly startY: number;
}

export interface DragState {
  readonly type: 'drag';
  /** The session being dragged. */
  readonly session: ElementSession;
  /** Pointer X at drag start. */
  readonly startX: number;
  /** Pointer Y at drag start. */
  readonly startY: number;
  /** Accumulated dx from prior drag/resize before this gesture. */
  readonly baseOffsetX: number;
  /** Accumulated dy from prior drag/resize before this gesture. */
  readonly baseOffsetY: number;
}

export interface ResizeState {
  readonly type: 'resize';
  /** The session being resized. */
  readonly session: ElementSession;
  /** Which handle is being dragged. */
  readonly handle: ResizeHandle;
  /** Pointer X at resize start. */
  readonly startX: number;
  /** Pointer Y at resize start. */
  readonly startY: number;
  /** Width at resize start (includes any prior dw). */
  readonly baseWidth: number;
  /** Height at resize start (includes any prior dh). */
  readonly baseHeight: number;
  /** Position offset at resize start (includes any prior dx). */
  readonly baseDx: number;
  /** Position offset at resize start (includes any prior dy). */
  readonly baseDy: number;
}

/** Shared singleton representing the idle (no interaction) state. */
export const IDLE: IdleState = { type: 'idle' };

/**
 * Describes a gesture that just completed on pointer-up. Returned by the
 * interaction machine so the overlay can push an undo transaction.
 */
export type GestureCompletion =
  | {
      readonly gesture: 'move';
      readonly target: HTMLElement;
      readonly before: { readonly dx: number; readonly dy: number };
      readonly after: { readonly dx: number; readonly dy: number };
      readonly isNewClone: boolean;
      readonly referenceEl?: HTMLElement;
      readonly session: ElementSession;
    }
  | {
      readonly gesture: 'resize';
      readonly target: HTMLElement;
      readonly before: {
        readonly dx: number;
        readonly dy: number;
        readonly dw: number;
        readonly dh: number;
      };
      readonly after: {
        readonly dx: number;
        readonly dy: number;
        readonly dw: number;
        readonly dh: number;
      };
    };

/**
 * Derive the CSS cursor from the current interaction state and hover target.
 *
 * @param state - The current interaction state.
 * @param target - The hovered element, or null.
 * @returns The CSS cursor value.
 */
export const deriveCursor = (state: InteractionState, target: HTMLElement | null): string => {
  switch (state.type) {
    case 'drag':
      return 'grabbing';
    case 'resize':
      return HANDLE_CURSORS[state.handle];
    case 'hover':
      return state.handle ? HANDLE_CURSORS[state.handle] : 'grab';
    case 'pending-drag':
      return 'grab';
    default:
      return target ? 'grab' : '';
  }
};
