/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CascadeVirtualizerReturnValue } from '.';

export interface ChildVirtualizerConfig {
  getScrollElement: () => Element | null;
  scrollMargin: number;
  initialOffset: number;
  initialAnchorItemIndex: number | null;
}

export interface ConnectedChildState {
  cellId: string;
  rowIndex: number;
  scrollOffset: number;
  range: { startIndex: number; endIndex: number } | null;
  totalSize: number;
  totalItemCount: number;
  scrollAnchorItemIndex: number | null;
  isDetached: boolean;
}

export interface ChildConnectionHandle {
  reportState(state: Partial<ConnectedChildState>): void;
  detachScrollElement(): void;
  reattachScrollElement(): void;
  disconnect(): void;
}

export interface ChildVirtualizerController {
  /**
   * Lightweight registration that makes the scheduler aware of a row cell
   * before the full child component mounts. Returns a function to "dequeue" the cell.
   */
  enqueue(cellId: string, rowIndex: number): () => void;
  /**
   * Marks a row as "returning expanded" — it was previously expanded, scrolled
   * out of view, and is now remounting. When {@link enqueue} is called for a
   * returning row it bypasses the stagger queue and activates immediately.
   */
  markRowAsReturning(rowIndex: number): void;
  /**
   * Returns true if the row has been marked as returning via {@link markRowAsReturning}
   * but has not yet been consumed by {@link enqueue}. Allows the cell to bypass
   * the skeleton on its very first render, before effects fire.
   */
  isRowReturning(rowIndex: number): boolean;
  getChildConfig(rowIndex: number): ChildVirtualizerConfig;
  /**
   * Returns the current start position of a root row from the root
   * virtualizer's measurements. Unlike the memoized config, this always
   * reflects the latest measurements, keeping child virtualizers in sync
   * when the root remeasures items above them.
   */
  getScrollMarginForRow(rowIndex: number): number;
  connect(cellId: string, rowIndex: number): ChildConnectionHandle;
  getConnectedChildren(): ReadonlyMap<string, ConnectedChildState>;
  shouldActivate(rowIndex: number): boolean;
  readonly isRootStable: boolean;
  markRootStable(): void;
  subscribe(listener: () => void): () => void;
  getPersistedAnchor(cellId: string): number | null;
  destroy(): void;
}

export interface CreateChildVirtualizerControllerOptions {
  getRootVirtualizer: () => CascadeVirtualizerReturnValue | undefined;
  activationBudget?: number;
}

const DEFAULT_ACTIVATION_BUDGET = 5;

const createDefaultChildState = (cellId: string, rowIndex: number): ConnectedChildState => ({
  cellId,
  rowIndex,
  scrollOffset: 0,
  range: null,
  totalSize: 0,
  totalItemCount: 0,
  scrollAnchorItemIndex: null,
  isDetached: false,
});

export const createChildVirtualizerController = ({
  getRootVirtualizer,
  activationBudget = DEFAULT_ACTIVATION_BUDGET,
}: CreateChildVirtualizerControllerOptions): ChildVirtualizerController => {
  const connectedChildren = new Map<string, ConnectedChildState>();
  const persistedAnchors = new Map<string, number>();
  const activatedRows = new Set<number>();
  const enqueuedCells = new Set<string>();
  const listeners = new Set<() => void>();
  let rootStable = false;
  let staggerRafId: number | null = null;
  let stateUpdateRafId: number | null = null;

  const notifyListeners = () => {
    listeners.forEach((fn) => fn());
  };

  const scheduleStateUpdateNotification = () => {
    if (stateUpdateRafId !== null) return;
    stateUpdateRafId = requestAnimationFrame(() => {
      stateUpdateRafId = null;
      notifyListeners();
    });
  };

  const getViewportCenter = (): number => {
    const root = getRootVirtualizer();
    if (!root) return 0;
    const scrollEl = root.scrollElement;
    const offset = root.scrollOffset ?? 0;
    const height = scrollEl ? (scrollEl as HTMLElement).clientHeight ?? 0 : 0;
    return offset + height / 2;
  };

  const getRowDistance = (rowIndex: number): number => {
    const root = getRootVirtualizer();
    if (!root) return Infinity;
    const cache = root.measurementsCache[rowIndex];
    if (!cache) return Infinity;
    const rowCenter = cache.start + cache.size / 2;
    return Math.abs(rowCenter - getViewportCenter());
  };

  const scheduleStaggeredActivation = () => {
    if (staggerRafId !== null) return;
    if (!rootStable) return;

    const pendingRows = Array.from(connectedChildren.values())
      .filter((child) => !activatedRows.has(child.rowIndex))
      .map((child) => child.rowIndex);

    if (pendingRows.length === 0) return;

    pendingRows.sort((a, b) => getRowDistance(a) - getRowDistance(b));

    const activateNext = () => {
      staggerRafId = null;

      if (activatedRows.size >= activationBudget) return;

      const nextRow = pendingRows.shift();
      if (nextRow == null) return;

      activatedRows.add(nextRow);
      notifyListeners();

      if (pendingRows.length > 0 && activatedRows.size < activationBudget) {
        staggerRafId = requestAnimationFrame(activateNext);
      }
    };

    staggerRafId = requestAnimationFrame(activateNext);
  };

  const returningRows = new Set<number>();

  const markRowAsReturning: ChildVirtualizerController['markRowAsReturning'] = (rowIndex) => {
    returningRows.add(rowIndex);
  };

  const isRowReturning: ChildVirtualizerController['isRowReturning'] = (rowIndex) => {
    return returningRows.has(rowIndex);
  };

  const enqueue: ChildVirtualizerController['enqueue'] = (cellId, rowIndex) => {
    if (!connectedChildren.has(cellId)) {
      enqueuedCells.add(cellId);
      connectedChildren.set(cellId, createDefaultChildState(cellId, rowIndex));

      if (returningRows.has(rowIndex) && rootStable) {
        activatedRows.add(rowIndex);
        returningRows.delete(rowIndex);
      }

      notifyListeners();

      if (!activatedRows.has(rowIndex)) {
        scheduleStaggeredActivation();
      }
    }

    return () => {
      if (enqueuedCells.has(cellId)) {
        enqueuedCells.delete(cellId);
        activatedRows.delete(rowIndex);
        connectedChildren.delete(cellId);
        notifyListeners();
      }
    };
  };

  const getScrollMarginForRow: ChildVirtualizerController['getScrollMarginForRow'] = (rowIndex) => {
    const root = getRootVirtualizer();
    return root?.measurementsCache[rowIndex]?.start ?? 0;
  };

  const getChildConfig: ChildVirtualizerController['getChildConfig'] = (rowIndex) => {
    const root = getRootVirtualizer();
    const scrollMargin = getScrollMarginForRow(rowIndex);
    const initialOffset = root?.scrollOffset ?? 0;

    return {
      getScrollElement: () => root?.scrollElement ?? null,
      scrollMargin,
      initialOffset,
      initialAnchorItemIndex: null,
    };
  };

  const connect: ChildVirtualizerController['connect'] = (cellId, rowIndex) => {
    enqueuedCells.delete(cellId);

    const persisted = persistedAnchors.get(cellId) ?? null;

    if (!connectedChildren.has(cellId)) {
      const state = createDefaultChildState(cellId, rowIndex);
      if (persisted != null) {
        state.scrollAnchorItemIndex = persisted;
      }
      connectedChildren.set(cellId, state);
      notifyListeners();
      scheduleStaggeredActivation();
    } else if (persisted != null) {
      const current = connectedChildren.get(cellId)!;
      if (current.scrollAnchorItemIndex == null) {
        connectedChildren.set(cellId, { ...current, scrollAnchorItemIndex: persisted });
      }
    }

    let reconnecting = false;

    return {
      reportState(patch) {
        if (reconnecting) return;
        const current = connectedChildren.get(cellId);
        if (current) {
          connectedChildren.set(cellId, { ...current, ...patch });
          scheduleStateUpdateNotification();
        }
      },
      detachScrollElement() {
        const current = connectedChildren.get(cellId);
        if (!current || current.isDetached) return;

        if (current.scrollAnchorItemIndex != null) {
          persistedAnchors.set(cellId, current.scrollAnchorItemIndex);
        }
        connectedChildren.set(cellId, { ...current, isDetached: true });
        notifyListeners();
      },
      reattachScrollElement() {
        const current = connectedChildren.get(cellId);
        if (!current || !current.isDetached) return;

        reconnecting = true;
        connectedChildren.set(cellId, { ...current, isDetached: false });
        notifyListeners();

        requestAnimationFrame(() => {
          reconnecting = false;
        });
      },
      disconnect() {
        const current = connectedChildren.get(cellId);
        if (current?.scrollAnchorItemIndex != null) {
          persistedAnchors.set(cellId, current.scrollAnchorItemIndex);
        }
        activatedRows.delete(rowIndex);
        connectedChildren.delete(cellId);
        notifyListeners();
        scheduleStaggeredActivation();
      },
    };
  };

  const getConnectedChildren: ChildVirtualizerController['getConnectedChildren'] = () =>
    connectedChildren;

  const shouldActivate: ChildVirtualizerController['shouldActivate'] = (rowIndex) => {
    if (!rootStable) return false;
    return activatedRows.has(rowIndex);
  };

  const subscribe: ChildVirtualizerController['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getPersistedAnchor: ChildVirtualizerController['getPersistedAnchor'] = (cellId) => {
    return persistedAnchors.get(cellId) ?? null;
  };

  const markRootStable: ChildVirtualizerController['markRootStable'] = () => {
    rootStable = true;
    notifyListeners();
    scheduleStaggeredActivation();
  };

  const destroy = () => {
    if (staggerRafId !== null) {
      cancelAnimationFrame(staggerRafId);
      staggerRafId = null;
    }
    if (stateUpdateRafId !== null) {
      cancelAnimationFrame(stateUpdateRafId);
      stateUpdateRafId = null;
    }
  };

  return {
    enqueue,
    markRowAsReturning,
    isRowReturning,
    getChildConfig,
    getScrollMarginForRow,
    connect,
    getConnectedChildren,
    shouldActivate,
    get isRootStable() {
      return rootStable;
    },
    markRootStable,
    subscribe,
    getPersistedAnchor,
    destroy,
  };
};
