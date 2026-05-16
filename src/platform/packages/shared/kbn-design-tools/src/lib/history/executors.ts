/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementRegistry } from '../dom/element_registry';
import { revertEdits, applyEditChanges } from '../dom/element_registry';
import { setImportant } from '../dom/clone_element';
import { buildTransform } from '../dom/resize_helpers';
import { DEVTOOL_HIDDEN_ATTR } from '../constants';
import { restoreSession } from './snapshot';
import type {
  Transaction,
  MoveTransaction,
  ResizeTransaction,
  EditTransaction,
  DuplicateTransaction,
  DeleteTransaction,
  CloneTransaction,
  ElementSessionSnapshot,
} from './transaction';

/**
 * A pair of functions that know how to apply a transaction forward (redo)
 * and reverse it (undo). Executors are stateless — all state lives on the
 * transaction and the registry.
 */
export interface TransactionExecutor<T extends Transaction> {
  /** Apply the transaction's effect (forward / redo). */
  apply(tx: T, registry: ElementRegistry): void;
  /** Reverse the transaction's effect (undo). */
  reverse(tx: T, registry: ElementRegistry): void;
}

/**
 * Re-insert an element at its snapshotted DOM position.
 *
 * If `nextSibling` has been reparented (e.g. by a React re-render)
 * since the snapshot was taken, falls back to `appendChild`.
 */
const insertAtSnapshot = (element: HTMLElement, snapshot: ElementSessionSnapshot): void => {
  const { parentNode, nextSibling } = snapshot;
  if (nextSibling && nextSibling.parentNode === parentNode) {
    parentNode.insertBefore(element, nextSibling);
  } else {
    parentNode.appendChild(element);
  }
};

/**
 * Rebuild the CSS transform on a managed element from its session's
 * current dx/dy/dw/dh values. Shared by move and resize executors.
 */
const rebuildTransform = (
  el: HTMLElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  originalRect: DOMRect
): void => {
  const scaleX = (originalRect.width + dw) / originalRect.width;
  const scaleY = (originalRect.height + dh) / originalRect.height;
  setImportant(el, 'transform', buildTransform(dx, dy, scaleX, scaleY));
};

/**
 * Applies or reverses a move by writing the target position offsets to
 * the session and rebuilding the CSS transform.
 *
 * No DOM structural changes — just updates `session.dx/dy` and the
 * element's inline `transform`.
 */
export const moveExecutor: TransactionExecutor<MoveTransaction> = {
  apply(tx, registry) {
    const session = registry.get(tx.target);
    if (!session) return;
    session.dx = tx.after.dx;
    session.dy = tx.after.dy;
    rebuildTransform(
      session.el,
      session.dx,
      session.dy,
      session.dw,
      session.dh,
      session.originalRect
    );
  },

  reverse(tx, registry) {
    const session = registry.get(tx.target);
    if (!session) return;
    session.dx = tx.before.dx;
    session.dy = tx.before.dy;
    rebuildTransform(
      session.el,
      session.dx,
      session.dy,
      session.dw,
      session.dh,
      session.originalRect
    );
  },
};

/**
 * Applies or reverses a resize by writing all four deltas (dx, dy, dw,
 * dh) to the session and rebuilding the CSS transform.
 *
 * Same pattern as move but also changes the scale component.
 */
export const resizeExecutor: TransactionExecutor<ResizeTransaction> = {
  apply(tx, registry) {
    const session = registry.get(tx.target);
    if (!session) return;
    session.dx = tx.after.dx;
    session.dy = tx.after.dy;
    session.dw = tx.after.dw;
    session.dh = tx.after.dh;
    rebuildTransform(
      session.el,
      session.dx,
      session.dy,
      session.dw,
      session.dh,
      session.originalRect
    );
  },

  reverse(tx, registry) {
    const session = registry.get(tx.target);
    if (!session) return;
    session.dx = tx.before.dx;
    session.dy = tx.before.dy;
    session.dw = tx.before.dw;
    session.dh = tx.before.dh;
    rebuildTransform(
      session.el,
      session.dx,
      session.dy,
      session.dw,
      session.dh,
      session.originalRect
    );
  },
};

/**
 * Applies or reverses a batch of style/text/source edits from the edit
 * modal.
 *
 * Forward: re-applies the saved change descriptors using `setImportant`
 * and direct DOM writes (same logic as `useEditChangeTracker.applyEdits`).
 *
 * Reverse: delegates to `revertEdits` which restores original values
 * from the undo records and clears the arrays.
 *
 * Note: after reversing, the `undoRecords` arrays are empty (cleared by
 * `revertEdits`). A subsequent redo will re-populate them.
 */
export const editExecutor: TransactionExecutor<EditTransaction> = {
  apply(tx, registry) {
    const session = registry.get(tx.target);
    if (!session) return;

    applyEditChanges(
      tx.styleChanges,
      tx.textChanges,
      tx.sourceChanges,
      tx.undoRecords.styleEdits,
      tx.undoRecords.textEdits,
      tx.undoRecords.sourceEdits
    );
  },

  reverse(tx) {
    const { styleEdits, textEdits, sourceEdits } = tx.undoRecords;
    if (styleEdits.length === 0 && textEdits.length === 0 && sourceEdits.length === 0) return;
    revertEdits(styleEdits, textEdits, sourceEdits);
  },
};

/**
 * Applies or reverses a duplication.
 *
 * Forward: re-inserts the duplicate element at its recorded DOM position
 * and re-registers the session.
 *
 * Reverse: removes the element from the DOM and unregisters the session.
 */
/**
 * Re-insert an element from a session snapshot and rebuild its CSS
 * transform so the visual position matches the session's dx/dy.
 *
 * Used by structural executors (duplicate, delete, clone) that remove
 * and re-insert elements.  Without the explicit rebuild the element
 * retains whatever stale inline transform it had when it was detached,
 * which can desynchronize from the session after an export/import
 * round-trip.
 */
const restoreAndRebuild = (
  element: HTMLElement,
  snapshot: ElementSessionSnapshot,
  registry: ElementRegistry
): void => {
  insertAtSnapshot(element, snapshot);
  const session = restoreSession(snapshot);
  registry.set(session);
  rebuildTransform(element, session.dx, session.dy, session.dw, session.dh, session.originalRect);
};

export const duplicateExecutor: TransactionExecutor<DuplicateTransaction> = {
  apply(tx, registry) {
    restoreAndRebuild(tx.element, tx.sessionSnapshot, registry);
  },

  reverse(tx, registry) {
    const session = registry.get(tx.element);
    if (session) {
      registry.delete(session);
    }
    tx.element.remove();
  },
};

/**
 * Applies or reverses an element deletion.
 *
 * For managed elements (with a session snapshot):
 *   Forward: removes the element and unregisters the session.
 *   Reverse: re-inserts at the recorded DOM position and restores the session.
 *
 * For unmanaged page elements (soft-deleted with fade-out):
 *   Forward: re-applies the soft-delete styles (visibility:hidden etc).
 *   Reverse: restores the original inline styles captured before deletion.
 */
export const deleteExecutor: TransactionExecutor<DeleteTransaction> = {
  apply(tx, registry) {
    if (tx.sessionSnapshot) {
      const session = registry.get(tx.element);
      if (session) {
        registry.delete(session);
      }
      tx.element.remove();
    } else if (tx.originalStyles) {
      setImportant(tx.element, 'visibility', 'hidden');
      setImportant(tx.element, 'pointer-events', 'none');
      tx.element.setAttribute(DEVTOOL_HIDDEN_ATTR, tx.originalStyles.transform);
    }
  },

  reverse(tx, registry) {
    if (tx.sessionSnapshot) {
      restoreAndRebuild(tx.element, tx.sessionSnapshot, registry);
    } else if (tx.originalStyles) {
      tx.element.style.transform = tx.originalStyles.transform;
      tx.element.style.visibility = tx.originalStyles.visibility;
      tx.element.style.pointerEvents = tx.originalStyles.pointerEvents;
      tx.element.style.opacity = tx.originalStyles.opacity;
      tx.element.style.transition = tx.originalStyles.transition;
      tx.element.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    }
  },
};

/**
 * Applies or reverses a first-time drag (page element → managed clone).
 *
 * Forward: re-inserts the clone into the DOM, re-hides the original
 * in-flow element, and re-registers the session.
 *
 * Reverse: removes the clone, un-hides the original (restoring its
 * transform / visibility / pointer-events), and unregisters the session.
 */
export const cloneExecutor: TransactionExecutor<CloneTransaction> = {
  apply(tx, registry) {
    const { sessionSnapshot, referenceEl } = tx;
    restoreAndRebuild(tx.element, sessionSnapshot, registry);

    const originalTransform = referenceEl.style.transform || '';
    referenceEl.setAttribute(DEVTOOL_HIDDEN_ATTR, originalTransform);
    setImportant(referenceEl, 'visibility', 'hidden');
    setImportant(referenceEl, 'pointer-events', 'none');
  },

  reverse(tx, registry) {
    const session = registry.get(tx.element);
    if (session) {
      registry.delete(session);
    }
    tx.element.remove();

    const { referenceEl } = tx;
    if (referenceEl.hasAttribute(DEVTOOL_HIDDEN_ATTR)) {
      referenceEl.style.transform = referenceEl.getAttribute(DEVTOOL_HIDDEN_ATTR) ?? '';
      referenceEl.style.removeProperty('visibility');
      referenceEl.style.removeProperty('pointer-events');
      referenceEl.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    }
  },
};

/**
 * Dispatch a transaction to the appropriate executor's apply or reverse
 * method based on its `type` discriminant.
 *
 * @param tx - The transaction to execute.
 * @param registry - The element registry for session lookups.
 * @param direction - Whether to apply forward or reverse.
 */
export const executeTransaction = (
  tx: Transaction,
  registry: ElementRegistry,
  direction: 'apply' | 'reverse'
): void => {
  switch (tx.type) {
    case 'move':
      moveExecutor[direction](tx, registry);
      break;
    case 'resize':
      resizeExecutor[direction](tx, registry);
      break;
    case 'edit':
      editExecutor[direction](tx, registry);
      break;
    case 'duplicate':
      duplicateExecutor[direction](tx, registry);
      break;
    case 'delete':
      deleteExecutor[direction](tx, registry);
      break;
    case 'clone':
      cloneExecutor[direction](tx, registry);
      break;
  }
};
