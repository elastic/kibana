/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transaction } from './transaction';
import { MAX_UNDO_ENTRIES } from '../constants';

/**
 * Minimal shape required by the stack for each entry.
 * The default type parameter uses {@link Transaction}, but lighter
 * entry types (e.g. draft edits) can satisfy this constraint too.
 */
export interface StackEntry {
  readonly id: number;
  readonly timestamp: number;
  readonly label: string;
}

/**
 * Snapshot of the stack's observable state. Consumed by the React bridge
 * via `useSyncExternalStore` so toolbar buttons can react to stack
 * changes without polling.
 */
export interface UndoRedoSnapshot {
  /** Whether there is at least one transaction to undo. */
  readonly canUndo: boolean;
  /** Whether there is at least one transaction to redo. */
  readonly canRedo: boolean;
  /** Label of the next undo-able transaction (for tooltip display). */
  readonly undoLabel: string | undefined;
  /** Label of the next redo-able transaction (for tooltip display). */
  readonly redoLabel: string | undefined;
}

/**
 * A framework-agnostic, linear undo/redo history stack.
 *
 * ## Design
 *
 * - Lives in a `useRef` so pointer handlers can push transactions
 *   without triggering React re-renders.
 * - Any new forward mutation clears the redo stack (standard behaviour).
 * - Supports a subscriber model so a React bridge (via
 *   `useSyncExternalStore`) can observe state changes cheaply.
 * - Does NOT execute transactions. It only manages ordering; actual DOM
 *   mutations are delegated to {@link TransactionExecutor} functions.
 */
export class UndoRedoStack<T extends StackEntry = Transaction> {
  /** Transactions that can be undone, oldest first. */
  private readonly undoEntries: T[] = [];

  /** Transactions that can be redone, most-recently-undone first. */
  private readonly redoEntries: T[] = [];

  /** Monotonically increasing counter for transaction IDs. */
  private nextId = 1;

  /** Set of subscriber callbacks notified on every stack mutation. */
  private readonly listeners = new Set<() => void>();

  /** Cached snapshot, replaced only on mutation so `useSyncExternalStore`
   *  sees a stable reference between changes. */
  private cachedSnapshot: UndoRedoSnapshot = {
    canUndo: false,
    canRedo: false,
    undoLabel: undefined,
    redoLabel: undefined,
  };

  /**
   * Pushes a new transaction onto the undo stack.
   *
   * Assigns a monotonic `id` and `timestamp`, then clears the
   * redo stack (standard undo/redo behaviour: a new forward action
   * invalidates any undone future).
   *
   * Notifies all subscribers after the mutation.
   *
   * @param input - The transaction descriptor without `id`/`timestamp`.
   * @returns The fully-stamped transaction that was pushed.
   */
  public push(input: Omit<T, 'id' | 'timestamp'>): T {
    const tx: T = {
      ...(input as T),
      id: this.nextId++,
      timestamp: Date.now(),
    };
    this.undoEntries.push(tx);
    // Drop the oldest entries when the stack exceeds the limit.
    while (this.undoEntries.length > MAX_UNDO_ENTRIES) {
      this.undoEntries.shift();
    }
    this.redoEntries.length = 0;
    this.notify();
    return tx;
  }

  /**
   * Pops the most recent transaction from the undo stack and moves it to
   * the redo stack.
   *
   * The caller is responsible for executing the transaction's reverse
   * operation via the appropriate executor.
   *
   * @returns The undone transaction, or `null` if the undo stack is empty.
   */
  public undo(): T | null {
    const tx = this.undoEntries.pop();
    if (!tx) return null;
    this.redoEntries.push(tx);
    this.notify();
    return tx;
  }

  /**
   * Pops the most recently undone transaction from the redo stack and moves
   * it back onto the undo stack.
   *
   * The caller is responsible for executing the transaction's forward
   * operation via the appropriate executor.
   *
   * @returns The redone transaction, or `null` if the redo stack is empty.
   */
  public redo(): T | null {
    const tx = this.redoEntries.pop();
    if (!tx) return null;
    this.undoEntries.push(tx);
    this.notify();
    return tx;
  }

  /**
   * Clears both stacks entirely.
   *
   * Called when the user exits edit mode (`resetAll`) or navigates away.
   * History is not preserved across edit sessions.
   */
  public clear(): void {
    this.undoEntries.length = 0;
    this.redoEntries.length = 0;
    this.nextId = 1;
    this.notify();
  }

  /** Whether the undo stack has at least one entry. */
  public get canUndo(): boolean {
    return this.undoEntries.length > 0;
  }

  /** Whether the redo stack has at least one entry. */
  public get canRedo(): boolean {
    return this.redoEntries.length > 0;
  }

  /** Label of the top-most undo entry, or `undefined` if empty. */
  public get undoLabel(): string | undefined {
    return this.undoEntries.at(-1)?.label;
  }

  /** Label of the top-most redo entry, or `undefined` if empty. */
  public get redoLabel(): string | undefined {
    return this.redoEntries.at(-1)?.label;
  }

  /** Number of entries currently on the undo stack. */
  public get undoSize(): number {
    return this.undoEntries.length;
  }

  /** Number of entries currently on the redo stack. */
  public get redoSize(): number {
    return this.redoEntries.length;
  }

  /** Returns the IDs of all entries on the active (undo) stack. */
  public get activeIds(): ReadonlySet<number> {
    return new Set(this.undoEntries.map((e) => e.id));
  }

  /**
   * Returns a cached snapshot of the stack's observable state.
   *
   * Used by the React bridge (`useSyncExternalStore`) as the
   * `getSnapshot` function. Returns the same object reference until
   * the stack is mutated, which is critical for avoiding infinite
   * re-render loops in `useSyncExternalStore`.
   */
  public getSnapshot(): UndoRedoSnapshot {
    return this.cachedSnapshot;
  }

  /**
   * Subscribes to stack mutations.
   *
   * The callback is invoked synchronously after every `push`, `undo`,
   * `redo`, or `clear` call. Designed for use with
   * `useSyncExternalStore`.
   *
   * @param fn - Callback invoked on each mutation.
   * @returns An unsubscribe function.
   */
  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * Rebuilds the cached snapshot and notifies all subscribers that the
   * stack state has changed. Called after every public mutator method.
   */
  private notify(): void {
    this.cachedSnapshot = {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      undoLabel: this.undoLabel,
      redoLabel: this.redoLabel,
    };
    for (const fn of this.listeners) {
      fn();
    }
  }
}
