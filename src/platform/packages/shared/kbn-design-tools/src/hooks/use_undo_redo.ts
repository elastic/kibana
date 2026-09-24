/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { MutableRefObject } from 'react';
import { UndoRedoStack } from '../lib/history/undo_redo_stack';
import type { UndoRedoSnapshot } from '../lib/history/undo_redo_stack';
import { executeTransaction } from '../lib/history/executors';
import type { ElementRegistry } from '../edit_engine/element_registry';
import type { TransactionInput } from '../lib/history/transaction';

/**
 * React bridge for the {@link UndoRedoStack}.
 *
 * Provides:
 * - `push` - record a new transaction (callable from pointer handlers
 *   without triggering renders).
 * - `undo` / `redo` - execute the reverse/forward operation and move
 *   the transaction between stacks.
 * - `clear` - wipe all history (called by `resetAll`).
 * - `state` - reactive snapshot of `canUndo/canRedo/undoLabel/redoLabel`
 *   for toolbar buttons, powered by `useSyncExternalStore`.
 * - `stack` - the underlying `UndoRedoStack` instance (via ref) for
 *   direct access when needed (e.g. serialization).
 *
 * The stack itself lives in a `useRef` so pointer handlers can call
 * `push` without paying for `useState` re-renders on every gesture.
 *
 * @param registryRef - Ref to the element registry, needed by executors
 *   to look up sessions when applying/reversing transactions.
 * @returns Undo/redo controls, reactive state, and the underlying stack.
 */
export const useUndoRedo = (registryRef: MutableRefObject<ElementRegistry>) => {
  const stackRef = useRef(new UndoRedoStack());
  const stack = stackRef.current;

  /**
   * Reactive snapshot of the stack's state. Re-renders consuming
   * components only when `canUndo`, `canRedo`, `undoLabel`, or
   * `redoLabel` changes.
   */
  const state: UndoRedoSnapshot = useSyncExternalStore(
    useCallback((cb: () => void) => stack.subscribe(cb), [stack]),
    useCallback(() => stack.getSnapshot(), [stack])
  );

  /**
   * Pushes a new transaction onto the undo stack. Safe to call from
   * pointer handlers; does not trigger a React re-render directly
   * (subscribers are notified, but `useSyncExternalStore` batches).
   */
  const push = useCallback((input: TransactionInput) => stack.push(input), [stack]);

  /**
   * Undoes the most recent transaction: pops it from the undo stack,
   * executes its reverse operation via the appropriate executor, and
   * pushes it onto the redo stack.
   *
   * Returns `true` if a transaction was undone, `false` if the stack
   * was empty.
   */
  const undo = useCallback(() => {
    const tx = stack.undo();
    if (!tx) return false;
    executeTransaction(tx, registryRef.current, 'reverse');
    return true;
  }, [stack, registryRef]);

  /**
   * Redoes the most recently undone transaction: pops it from the redo
   * stack, executes its forward operation, and pushes it back onto the
   * undo stack.
   *
   * Returns `true` if a transaction was redone, `false` if the redo
   * stack was empty.
   */
  const redo = useCallback(() => {
    const tx = stack.redo();
    if (!tx) return false;
    executeTransaction(tx, registryRef.current, 'apply');
    return true;
  }, [stack, registryRef]);

  /**
   * Clear all history. Called when the user exits edit mode or
   * navigates away (`resetAll`).
   */
  const clear = useCallback(() => stack.clear(), [stack]);

  return useMemo(
    () => ({ push, undo, redo, clear, state, stack }),
    [push, undo, redo, clear, state, stack]
  );
};
