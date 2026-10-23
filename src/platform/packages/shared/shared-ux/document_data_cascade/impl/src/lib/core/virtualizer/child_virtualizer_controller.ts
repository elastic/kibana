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
  /**
   * Whether the connection has reported its state at least once since connecting.
   */
  hasSynced: boolean;
}

export interface ChildConnectionOptions {
  /**
   * Whether the connection persists its scroll anchor (default `true`). When `false`, a previously
   * persisted anchor for the same id is discarded and no anchor is hydrated, reported or persisted
   * for the connection.
   */
  persistScrollAnchor?: boolean;
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
  /**
   * Registers a connection for a row. `rowIndex` is the row's index in the root virtualizer.
   * Several connections may share a row (e.g. alternate views of a cell's content), each under
   * its own id; the row stays activated while any of them remains.
   */
  connect(
    cellId: string,
    rowIndex: number,
    options?: ChildConnectionOptions
  ): ChildConnectionHandle;
  getConnectedChildren(): ReadonlyMap<string, ConnectedChildState>;
  shouldActivate(rowIndex: number): boolean;
  readonly isRootStable: boolean;
  markRootStable(): void;
  subscribe(listener: () => void): () => void;
  getPersistedAnchor(cellId: string): number | null;
  /**
   * Removes a persisted anchor for a cell. Called when a row collapses so that
   * re-expanding goes through the normal stagger/skeleton path. The root no longer
   * waits for such a cell to restore its scroll position.
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
  /**
   * Returns true when the root virtualizer should compensate its scroll position
   * for a size change of the given row. Returns false while the row has an attached
   * (non-detached) connection that owns scroll compensation: a connection owns it once
   * it has reported its state, and a connection that replaces an owning one inherits it
   * until it reports or disconnects itself. Such a child virtualizer compensates for its
   * own content, which keeps its scroll restoration intact when the cell content is
   * swapped and avoids compensating the same change twice.
   */
  shouldAdjustScrollForRow(rowIndex: number): boolean;
  /**
   * Scroll anchors persisted for cells that currently have no connection (e.g. a view that was
   * swapped out); a cell that is merely enqueued counts as unconnected. They are part of the
   * restorable state, so that such a cell restores its position when it reconnects after the
   * cascade itself was restored.
   */
  getRetainedAnchors(): ReadonlyMap<string, number>;
  destroy(): void;
}

export interface CreateChildVirtualizerControllerOptions {
  getRootVirtualizer: () => CascadeVirtualizerReturnValue | undefined;
  activationBudget?: number;
  /**
   * Anchors of the cells that were connected when the restored state was captured. The root
   * virtualizer waits for these cells to restore their scroll position before it stabilizes.
   */
  initialPersistedAnchors?: Record<string, number | null>;
  /**
   * Anchors of the cells that had no connection when the restored state was captured. They are
   * restored when the cells reconnect, without being awaited by the root virtualizer.
   */
  initialRetainedAnchors?: Record<string, number | null>;
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
  hasSynced: false,
});

export const createChildVirtualizerController = ({
  getRootVirtualizer,
  activationBudget = DEFAULT_ACTIVATION_BUDGET,
  initialPersistedAnchors,
  initialRetainedAnchors,
}: CreateChildVirtualizerControllerOptions): ChildVirtualizerController => {
  const connectedChildren = new Map<string, ConnectedChildState>();
  const connectionTokens = new Map<string, symbol>();
  const persistedAnchors = new Map<string, number>();
  const initialPersistedCellIds = new Set<string>();
  const stabilizedPersistedCellIds = new Set<string>();

  if (initialRetainedAnchors) {
    for (const [cellId, anchor] of Object.entries(initialRetainedAnchors)) {
      if (anchor != null) {
        persistedAnchors.set(cellId, anchor);
      }
    }
  }

  if (initialPersistedAnchors) {
    for (const [cellId, anchor] of Object.entries(initialPersistedAnchors)) {
      if (anchor != null) {
        persistedAnchors.set(cellId, anchor);
        initialPersistedCellIds.add(cellId);
      }
    }
  }

  const activatedRows = new Set<number>();
  // connections that inherited scroll compensation from an owning connection of the same row
  // when they connected, until they report their own state
  const ownershipHandovers = new Set<string>();
  const enqueuedCells = new Set<string>();
  const listeners = new Set<() => void>();
  let rootStable = false;
  let staggerRafId: number | null = null;
  let stateUpdateRafId: number | null = null;

  const notifyListeners = () => {
    listeners.forEach((fn) => fn());
  };

  const hasChildForRow = (rowIndex: number) => {
    for (const child of connectedChildren.values()) {
      if (child.rowIndex === rowIndex) return true;
    }
    return false;
  };

  // A row may have several connections at once (e.g. alternate views of a cell's content),
  // so per-row state is only released once the last of them is gone.
  const releaseRowIfUnconnected = (rowIndex: number) => {
    if (hasChildForRow(rowIndex)) return;
    activatedRows.delete(rowIndex);
  };

  const ownsScrollCompensation = (cellId: string, child: ConnectedChildState) =>
    connectionTokens.has(cellId) &&
    !child.isDetached &&
    (child.hasSynced || ownershipHandovers.has(cellId));

  const hasOwningChildForRow = (rowIndex: number, exceptCellId: string) => {
    for (const [cellId, child] of connectedChildren) {
      if (
        cellId !== exceptCellId &&
        child.rowIndex === rowIndex &&
        ownsScrollCompensation(cellId, child)
      ) {
        return true;
      }
    }
    return false;
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

  const getPendingRows = () => {
    const pendingRows = new Set<number>();
    for (const child of connectedChildren.values()) {
      if (!activatedRows.has(child.rowIndex)) {
        pendingRows.add(child.rowIndex);
      }
    }
    return Array.from(pendingRows).sort((a, b) => getRowDistance(a) - getRowDistance(b));
  };

  // Activates one pending row per animation frame, closest to the viewport first. Pending rows
  // are re-evaluated on every frame so that connections added or removed while a frame is
  // pending are taken into account.
  const scheduleStaggeredActivation = () => {
    if (staggerRafId !== null) return;
    if (!rootStable) return;
    if (getPendingRows().length === 0) return;

    const activateNext = () => {
      staggerRafId = null;

      if (activatedRows.size >= activationBudget) return;

      const [nextRow, ...remainingRows] = getPendingRows();
      if (nextRow == null) return;

      activatedRows.add(nextRow);
      notifyListeners();

      if (remainingRows.length > 0 && activatedRows.size < activationBudget) {
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
        connectedChildren.delete(cellId);
        releaseRowIfUnconnected(rowIndex);
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

  const connect: ChildVirtualizerController['connect'] = (
    cellId,
    rowIndex,
    { persistScrollAnchor = true } = {}
  ) => {
    enqueuedCells.delete(cellId);

    if (!persistScrollAnchor) {
      persistedAnchors.delete(cellId);
      initialPersistedCellIds.delete(cellId);
    }

    const persisted = persistScrollAnchor ? persistedAnchors.get(cellId) ?? null : null;

    // A connection replacing an owning connection of the same row takes over scroll compensation
    // right away, so that the root does not compensate for the swap itself before the new
    // connection has reported (see `shouldAdjustScrollForRow`).
    const inheritsOwnership = hasOwningChildForRow(rowIndex, cellId);

    const current = connectedChildren.get(cellId);

    if (!current) {
      const state = createDefaultChildState(cellId, rowIndex);
      if (persisted != null) {
        state.scrollAnchorItemIndex = persisted;
      }
      connectedChildren.set(cellId, state);
    } else {
      // promoting an enqueued cell, or reconnecting under the same id (possibly for another row)
      const previousRowIndex = current.rowIndex;
      connectedChildren.set(cellId, {
        ...current,
        rowIndex,
        scrollAnchorItemIndex: !persistScrollAnchor
          ? null
          : current.scrollAnchorItemIndex ?? persisted,
      });
      if (previousRowIndex !== rowIndex) {
        // the cell moved to another row: keep it activated rather than re-staggering it
        if (activatedRows.has(previousRowIndex)) {
          activatedRows.add(rowIndex);
        }
        releaseRowIfUnconnected(previousRowIndex);
      }
    }

    const token = Symbol(cellId);
    connectionTokens.set(cellId, token);
    if (inheritsOwnership) {
      ownershipHandovers.add(cellId);
    } else {
      ownershipHandovers.delete(cellId);
    }

    notifyListeners();
    scheduleStaggeredActivation();

    let reconnecting = false;

    const isCurrentConnection = () => connectionTokens.get(cellId) === token;

    return {
      reportState(patch) {
        if (reconnecting || !isCurrentConnection()) return;
        const state = connectedChildren.get(cellId);
        if (!state) return;

        const { scrollAnchorItemIndex, ...rest } = patch;
        connectedChildren.set(cellId, {
          ...state,
          ...rest,
          ...(persistScrollAnchor && scrollAnchorItemIndex !== undefined
            ? { scrollAnchorItemIndex }
            : {}),
          hasSynced: true,
        });
        ownershipHandovers.delete(cellId);

        if (patch.hasStabilized && initialPersistedCellIds.has(cellId)) {
          stabilizedPersistedCellIds.add(cellId);
        }
        scheduleStateUpdateNotification();
      },
      detachScrollElement() {
        if (!isCurrentConnection()) return;
        const state = connectedChildren.get(cellId);
        if (!state || state.isDetached) return;

        if (persistScrollAnchor && state.scrollAnchorItemIndex != null) {
          persistedAnchors.set(cellId, state.scrollAnchorItemIndex);
        }
        connectedChildren.set(cellId, { ...state, isDetached: true });
        notifyListeners();
      },
      reattachScrollElement() {
        if (!isCurrentConnection()) return;
        const state = connectedChildren.get(cellId);
        if (!state || !state.isDetached) return;

        reconnecting = true;
        connectedChildren.set(cellId, { ...state, isDetached: false });
        notifyListeners();

        requestAnimationFrame(() => {
          reconnecting = false;
        });
      },
      disconnect() {
        if (!isCurrentConnection()) return;
        connectionTokens.delete(cellId);
        ownershipHandovers.delete(cellId);
        const state = connectedChildren.get(cellId);
        if (persistScrollAnchor && state?.scrollAnchorItemIndex != null) {
          persistedAnchors.set(cellId, state.scrollAnchorItemIndex);
        }
        connectedChildren.delete(cellId);
        releaseRowIfUnconnected(rowIndex);
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
    // a cell whose anchor is gone has nothing left to restore, so the root must not wait for it
    const wasRestoring = initialPersistedCellIds.delete(cellId);
    if (persistedAnchors.delete(cellId) || wasRestoring) {
      notifyListeners();
    }
  };

  const getRetainedAnchors: ChildVirtualizerController['getRetainedAnchors'] = () => {
    const retainedAnchors = new Map<string, number>();
    for (const [cellId, anchor] of persistedAnchors) {
      // an enqueued placeholder is not a connection: its anchor is still only retained
      if (!connectionTokens.has(cellId)) {
        retainedAnchors.set(cellId, anchor);
      }
    }
    return retainedAnchors;
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

  const shouldAdjustScrollForRow: ChildVirtualizerController['shouldAdjustScrollForRow'] = (
    rowIndex
  ) => {
    for (const [cellId, child] of connectedChildren) {
      if (child.rowIndex === rowIndex && ownsScrollCompensation(cellId, child)) {
        return false;
      }
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
    shouldAdjustScrollForRow,
    getRetainedAnchors,
    destroy,
  };
};
