/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementSession } from '../../edit_engine/element_registry';
import type { ElementSessionSnapshot } from './transaction';

/**
 * Captures a point-in-time snapshot of an {@link ElementSession}.
 *
 * The snapshot includes:
 * - All positional state (dx, dy, dw, dh, originalRect)
 * - Ownership flags (isDuplicate, referenceEl)
 * - Live React element descriptor and component state (if present)
 * - DOM insertion point (parentNode + nextSibling) for re-insertion
 * - Deep copies of all edit arrays so they are immune to future
 *   mutations on the session
 *
 * Used by structural transactions (duplicate, delete, clone) to
 * record enough state to fully reverse the operation.
 *
 * @param session - The live session to snapshot.
 * @returns A frozen snapshot that can be stored on a transaction.
 */
export const snapshotSession = (session: ElementSession): ElementSessionSnapshot => {
  const { el } = session;

  return {
    el,
    dx: session.dx,
    dy: session.dy,
    dw: session.dw,
    dh: session.dh,
    originalRect: new DOMRect(
      session.originalRect.x,
      session.originalRect.y,
      session.originalRect.width,
      session.originalRect.height
    ),
    isDuplicate: session.isDuplicate,
    referenceEl: session.referenceEl,
    liveReactElement: session.liveReactElement,
    // Record where the element currently lives in the DOM so we can
    // re-insert it at the same position on undo.
    parentNode: el.parentNode ?? document.body,
    nextSibling: el.nextSibling,
    // Shallow-copy edit arrays. Entries share element references with
    // the session intentionally (undo/redo operates on the same DOM
    // nodes). Only the array identity is decoupled.
    styleEdits: [...session.styleEdits],
    textEdits: [...session.textEdits],
    mediaEdits: [...session.mediaEdits],
    cleanup: session.cleanup,
  };
};

/**
 * Restores a session from a snapshot.
 *
 * Creates a fresh {@link ElementSession} from the snapshot's values.
 * Does NOT re-insert the element into the DOM or register it with the
 * registry. Callers are responsible for those operations.
 *
 * @param snapshot - The snapshot to restore from.
 * @returns A new session object with the snapshot's state.
 */
export const restoreSession = (snapshot: ElementSessionSnapshot): ElementSession => ({
  el: snapshot.el,
  dx: snapshot.dx,
  dy: snapshot.dy,
  dw: snapshot.dw,
  dh: snapshot.dh,
  originalRect: new DOMRect(
    snapshot.originalRect.x,
    snapshot.originalRect.y,
    snapshot.originalRect.width,
    snapshot.originalRect.height
  ),
  isDuplicate: snapshot.isDuplicate,
  referenceEl: snapshot.referenceEl,
  liveReactElement: snapshot.liveReactElement,
  // Restore copies of the edit arrays so they can accumulate new edits
  // independently.
  styleEdits: [...snapshot.styleEdits],
  textEdits: [...snapshot.textEdits],
  mediaEdits: [...snapshot.mediaEdits],
  cleanup: snapshot.cleanup,
});

/**
 * Capture the original inline styles of an unmanaged page element
 * before a soft-delete (fade-out + visibility:hidden).
 *
 * Stored on a {@link DeleteTransaction} so the delete
 * executor can restore them on undo.
 *
 * @param el - The page element about to be soft-deleted.
 * @returns An object with the five inline style values that soft-delete
 *          overwrites.
 */
export const captureOriginalStyles = (
  el: HTMLElement
): {
  transform: string;
  visibility: string;
  pointerEvents: string;
  opacity: string;
  transition: string;
} => ({
  transform: el.style.transform,
  visibility: el.style.visibility,
  pointerEvents: el.style.pointerEvents,
  opacity: el.style.opacity,
  transition: el.style.transition,
});
