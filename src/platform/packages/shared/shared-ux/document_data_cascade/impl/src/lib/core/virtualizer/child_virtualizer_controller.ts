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
  hasStabilized: boolean;
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
   * Returns true if the cell has a persisted anchor, meaning it was previously
   * connected and is now remounting. Allows the cell to bypass the skeleton on
   * its very first render, before effects fire.
   */
  isReturningCell(cellId: string): boolean;
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
  /**
   * Removes a persisted anchor for a cell. Called when a row collapses so that
   * re-expanding goes through the normal stagger/skeleton path.
   */
  clearPersistedAnchor(cellId: string): void;
  /**
   * Returns true when at least one connected (non-detached) child has a
   * persisted scroll anchor. Used by the root virtualizer to decide whether
   * to yield post-measurement corrections to a child.
   */
  hasConnectedChildWithPersistedAnchor(): boolean;
  /**
   * Returns true when every child that had an initial persisted anchor has
   * reported `hasStabilized: true`. Trivially true when no persisted anchors
   * existed at creation time.
   */
  haveAllRestoringChildrenStabilized(): boolean;
  destroy(): void;
}

export interface CreateChildVirtualizerControllerOptions {
  getRootVirtualizer: () => CascadeVirtualizerReturnValue | undefined;
  activationBudget?: number;
  initialPersistedAnchors?: Record<string, number | null>;
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
  hasStabilized: false,
});

export const createChildVirtualizerController = ({
  getRootVirtualizer,
  activationBudget = DEFAULT_ACTIVATION_BUDGET,
  initialPersistedAnchors,
}: CreateChildVirtualizerControllerOptions): ChildVirtualizerController => {
  const connectedChildren = new Map<string, ConnectedChildState>();
  const connectionTokens = new Map<string, symbol>();
  const persistedAnchors = new Map<string, number>();
  const initialPersistedCellIds = new Set<string>();
  const stabilizedPersistedCellIds = new Set<string>();

  if (initialPersistedAnchors) {
    for (const [cellId, anchor] of Object.entries(initialPersistedAnchors)) {
      if (anchor != null) {
        persistedAnchors.set(cellId, anchor);
        initialPersistedCellIds.add(cellId);
      }
    }
  }

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

  const isReturningCell: ChildVirtualizerController['isReturningCell'] = (cellId) => {
    return persistedAnchors.has(cellId);
  };

  const enqueue: ChildVirtualizerController['enqueue'] = (cellId, rowIndex) => {
    if (!connectedChildren.has(cellId)) {
      enqueuedCells.add(cellId);
      const state = createDefaultChildState(cellId, rowIndex);
      if (!persistedAnchors.has(cellId)) {
        state.hasStabilized = true;
      }

      connectedChildren.set(cellId, state);

      if (persistedAnchors.has(cellId) && rootStable) {
        activatedRows.add(rowIndex);
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
      if (current.scrollAnchorItemIndex === null) {
        connectedChildren.set(cellId, { ...current, scrollAnchorItemIndex: persisted });
      }
    }

    const token = Symbol(cellId);
    connectionTokens.set(cellId, token);
    let reconnecting = false;

    const isCurrentConnection = () => connectionTokens.get(cellId) === token;

    return {
      reportState(patch) {
        if (reconnecting || !isCurrentConnection()) return;
        const current = connectedChildren.get(cellId);
        if (current) {
          connectedChildren.set(cellId, { ...current, ...patch });
          if (patch.hasStabilized && initialPersistedCellIds.has(cellId)) {
            stabilizedPersistedCellIds.add(cellId);
          }
          scheduleStateUpdateNotification();
        }
      },
      detachScrollElement() {
        if (!isCurrentConnection()) return;
        const current = connectedChildren.get(cellId);
        if (!current || current.isDetached) return;

        if (current.scrollAnchorItemIndex != null) {
          persistedAnchors.set(cellId, current.scrollAnchorItemIndex);
        }
        connectedChildren.set(cellId, { ...current, isDetached: true });
        notifyListeners();
      },
      reattachScrollElement() {
        if (!isCurrentConnection()) return;
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
        if (!isCurrentConnection()) return;
        connectionTokens.delete(cellId);
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

  const clearPersistedAnchor: ChildVirtualizerController['clearPersistedAnchor'] = (cellId) => {
    persistedAnchors.delete(cellId);
  };

  const hasConnectedChildWithPersistedAnchor: ChildVirtualizerController['hasConnectedChildWithPersistedAnchor'] =
    () => {
      for (const [cellId, child] of connectedChildren) {
        if (!child.isDetached && persistedAnchors.has(cellId)) {
          return true;
        }
      }
      return false;
    };

  const haveAllRestoringChildrenStabilized: ChildVirtualizerController['haveAllRestoringChildrenStabilized'] =
    () => {
      if (initialPersistedCellIds.size === 0) return true;
      for (const cellId of initialPersistedCellIds) {
        if (!stabilizedPersistedCellIds.has(cellId)) return false;
      }
      return true;
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
    isReturningCell,
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
    clearPersistedAnchor,
    hasConnectedChildWithPersistedAnchor,
    haveAllRestoringChildrenStabilized,
    destroy,
  };
};
