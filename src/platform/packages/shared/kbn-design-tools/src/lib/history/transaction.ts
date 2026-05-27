/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import type {
  StyleEdit,
  TextEdit,
  MediaEdit,
  StyleChange,
  TextNodeChange,
  MediaChange,
} from '../../edit_engine/element_registry';

/**
 * Fields shared by every transaction. Assigned automatically by the
 * {@link UndoRedoStack} when a transaction is pushed.
 */
export interface TransactionBase {
  /** Monotonically increasing ID that defines ordering within a session. */
  readonly id: number;
  /** Wall-clock timestamp (for UI display / debugging, not ordering). */
  readonly timestamp: number;
  /** Human-readable label shown in undo/redo tooltips. */
  readonly label: string;
}

/**
 * A completed drag gesture (pointerup after drag).
 *
 * Records the element's translate offsets before and after the gesture so
 * the executor can swap between the two states for undo/redo.
 */
export interface MoveTransaction extends TransactionBase {
  readonly type: 'move';
  /** The managed element that was moved. */
  readonly target: HTMLElement;
  /** Translate offsets at gesture start (captured from baseOffsetX/Y). */
  readonly before: { readonly dx: number; readonly dy: number };
  /** Translate offsets at gesture end (captured from session.dx/dy). */
  readonly after: { readonly dx: number; readonly dy: number };
}

/**
 * A completed resize gesture (pointerup after resize).
 *
 * Records the element's translate + scale deltas before and after so the
 * executor can restore either state.
 */
export interface ResizeTransaction extends TransactionBase {
  readonly type: 'resize';
  /** The managed element that was resized. */
  readonly target: HTMLElement;
  /** Position + size deltas at gesture start. */
  readonly before: {
    readonly dx: number;
    readonly dy: number;
    readonly dw: number;
    readonly dh: number;
  };
  /** Position + size deltas at gesture end. */
  readonly after: {
    readonly dx: number;
    readonly dy: number;
    readonly dw: number;
    readonly dh: number;
  };
}

/**
 * A batch of style / text / media edits applied via the edit modal.
 *
 * The entire modal "Save" becomes a single transaction so it can be
 * undone/redone atomically.
 *
 * - `styleChanges`, `textChanges`, `mediaChanges` are the forward
 *   descriptors needed for redo.
 * - `undoRecords` are the original-value records produced by
 *   `applyEdits`, needed for undo.
 */
export interface EditTransaction extends TransactionBase {
  readonly type: 'edit';
  /** The top-level element the edit modal was opened on. */
  readonly target: HTMLElement;
  /**
   * When an original (non-managed) element was promoted to a managed clone
   * during save, this stores the hidden original so undo can restore it.
   */
  readonly promotedFrom?: HTMLElement;
  /** Forward descriptors, re-applied on redo. */
  readonly styleChanges: StyleChange[];
  readonly textChanges: TextNodeChange[];
  readonly mediaChanges: MediaChange[];
  /**
   * Original-value records created during forward application.
   * Used by the edit executor to reverse the changes on undo.
   * Mutable: the executor pushes entries during `apply` and clears
   * them during `reverse`.
   */
  readonly undoRecords: {
    styleEdits: StyleEdit[];
    textEdits: TextEdit[];
    mediaEdits: MediaEdit[];
  };
}

/**
 * An element was duplicated (Cmd+D or inserted from the component panel).
 *
 * Stores enough state to remove the duplicate on undo and re-insert it
 * (at the same DOM position) on redo.
 */
export interface DuplicateTransaction extends TransactionBase {
  readonly type: 'duplicate';
  /** The newly created duplicate element. */
  readonly element: HTMLElement;
  /**
   * Full session snapshot for re-insertion on redo after an undo.
   *
   * Mutable so the auto-drag that follows creation can update the
   * snapshot with the final dropped position, merging what would
   * otherwise be two transactions (duplicate + move) into one.
   */
  sessionSnapshot: ElementSessionSnapshot;
}

/**
 * An element was deleted (Delete/Backspace key).
 *
 * For managed elements (clones / duplicates / inserts), the session
 * snapshot captures everything needed to restore the element on undo.
 *
 * For unmanaged page elements (soft-deleted with fade-out), the original
 * inline styles are captured so they can be restored.
 */
export interface DeleteTransaction extends TransactionBase {
  readonly type: 'delete';
  /** The element that was removed / hidden. */
  readonly element: HTMLElement;
  /**
   * Session snapshot. Present when the deleted element had a registered
   * session. Contains position, edits, React state, and DOM location.
   */
  readonly sessionSnapshot?: ElementSessionSnapshot;
  /**
   * Original inline styles captured before the soft-delete fade-out.
   * Present only for unmanaged page elements (no session).
   */
  readonly originalStyles?: {
    readonly transform: string;
    readonly visibility: string;
    readonly pointerEvents: string;
    readonly opacity: string;
    readonly transition: string;
  };
}

/**
 * A page element was promoted to a managed clone via first-time drag.
 *
 * This is a structural DOM change (clone inserted, original hidden) that
 * should be a separate transaction from the subsequent move.
 */
export interface CloneTransaction extends TransactionBase {
  readonly type: 'clone';
  /** The newly created clone element. */
  readonly element: HTMLElement;
  /** Session snapshot of the clone for redo re-insertion. */
  readonly sessionSnapshot: ElementSessionSnapshot;
  /** The original in-flow element that was hidden. */
  readonly referenceEl: HTMLElement;
}

/**
 * An entire file import treated as a single atomic operation.
 *
 * On undo every imported session is removed from the registry and DOM,
 * and every soft-deleted element is un-hidden. On redo the sessions are
 * re-inserted and the deletions re-applied.
 */
export interface ImportTransaction extends TransactionBase {
  readonly type: 'import';
  /** Snapshots of all sessions that were created by the import. */
  readonly sessionSnapshots: Array<{
    readonly element: HTMLElement;
    readonly snapshot: ElementSessionSnapshot;
  }>;
  /** Elements that were soft-hidden by the import's deletion list. */
  readonly deletions: Array<{
    readonly element: HTMLElement;
    readonly originalTransform: string;
  }>;
}

/** Discriminated union of all transaction types. */
export type Transaction =
  | MoveTransaction
  | ResizeTransaction
  | EditTransaction
  | DuplicateTransaction
  | DeleteTransaction
  | CloneTransaction
  | ImportTransaction;

/**
 * Input type for {@link UndoRedoStack.push}. The `id` and `timestamp`
 * fields are assigned automatically by the stack.
 *
 * Uses a distributive conditional to preserve the union discriminant
 * (plain `Omit` on a union collapses it to a single object type).
 */
export type TransactionInput = Transaction extends infer T
  ? T extends Transaction
    ? Omit<T, 'id' | 'timestamp'>
    : never
  : never;

/**
 * A point-in-time capture of an {@link ElementSession} that contains
 * enough data to fully reconstruct or restore the session.
 *
 * Used by structural transactions (duplicate, delete, clone) to record
 * the state of the element before removal and re-insert it on undo.
 *
 * The `parentNode` / `nextSibling` pair records the element's DOM
 * position so it can be re-inserted at the exact same spot, not just
 * appended to `document.body`.
 */
export interface ElementSessionSnapshot {
  /** The managed element (kept as a live reference). */
  readonly el: HTMLElement;
  /** Horizontal translate offset at snapshot time. */
  readonly dx: number;
  /** Vertical translate offset at snapshot time. */
  readonly dy: number;
  /** Width delta from resize at snapshot time. */
  readonly dw: number;
  /** Height delta from resize at snapshot time. */
  readonly dh: number;
  /** The element's original bounding rect (captured at clone time). */
  readonly originalRect: DOMRect;
  /** Whether this was a duplicate (not a clone of an in-flow element). */
  readonly isDuplicate: boolean;
  /** The hidden in-flow original (for cloned elements). */
  readonly referenceEl?: HTMLElement;
  /** Live React element descriptor (for live-rendered elements). */
  readonly liveReactElement?: { readonly element: ReactElement; readonly zIndex: number };

  /** Parent node at the time of snapshot, for DOM re-insertion. */
  readonly parentNode: Node;
  /** Next sibling at the time of snapshot, for DOM re-insertion. */
  readonly nextSibling: Node | null;
  /** Copy of style edits accumulated at snapshot time. */
  readonly styleEdits: StyleEdit[];
  /** Copy of text edits accumulated at snapshot time. */
  readonly textEdits: TextEdit[];
  /** Copy of media/attribute edits accumulated at snapshot time. */
  readonly mediaEdits: MediaEdit[];
  /** Cleanup callback for live React roots. */
  readonly cleanup?: () => void;
}
