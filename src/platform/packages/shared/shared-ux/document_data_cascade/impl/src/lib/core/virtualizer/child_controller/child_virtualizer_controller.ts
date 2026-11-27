/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ChildMeasurements,
  ChildVirtualizerController,
  ConnectedChildState,
  CreateChildVirtualizerControllerOptions,
} from '../types';
import { areSameRows } from '../utils';

interface ChildEntry {
  /**
   * This is the target restoration anchor index for this child, on any remount of the document.
   */
  persistedAnchor: number | null;
  measurements?: ChildMeasurements;
  /**
   * This is the current state of the child, including the current scroll anchor item index.
   */
  state?: ConnectedChildState;
  /**
   * Provides an internal reference to for interacting with the connected child.
   */
  handle?: {
    token: symbol;
    cancelScroll?: () => void;
  };
}

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

/** Coordinates child mounts, measurements, and the single saved document anchor. */
export const createChildVirtualizerController = ({
  getRootVirtualizer,
  initialPersistedAnchors,
  initialRestorationCellId,
}: CreateChildVirtualizerControllerOptions): ChildVirtualizerController => {
  const controlledChildren = new Map<string, ChildEntry>();
  const enqueuedCells = new Map<string, symbol>();
  const activatedCells = new Set<string>();
  const listeners = new Set<() => void>();
  let restoringCellId = initialRestorationCellId;
  let rootStable = false;
  // number of cells that are currently enqueued or connected, the controller has nothing to coordinate without one
  let registeredChildCount = 0;
  let staggerRafId: number | null = null;
  let stateUpdateRafId: number | null = null;

  for (const [cellId, anchor] of Object.entries(initialPersistedAnchors ?? {})) {
    if (anchor != null) {
      controlledChildren.set(cellId, { persistedAnchor: anchor });
    }
  }

  if (restoringCellId && controlledChildren.get(restoringCellId)?.persistedAnchor == null) {
    restoringCellId = undefined;
  }

  const getOrCreateChild = (cellId: string): ChildEntry => {
    let child = controlledChildren.get(cellId);
    if (!child) {
      child = { persistedAnchor: null };
      controlledChildren.set(cellId, child);
    }
    return child;
  };

  const getConnectedChildren: ChildVirtualizerController['getConnectedChildren'] = () => {
    const children = new Map<string, ConnectedChildState>();
    for (const [cellId, { state }] of controlledChildren) {
      if (state) children.set(cellId, state);
    }
    return children;
  };

  const releaseChild = (cellId: string) => {
    const child = controlledChildren.get(cellId);
    if (enqueuedCells.has(cellId) || child?.handle) return;
    activatedCells.delete(cellId);
    if (!child) return;
    if (child.state) registeredChildCount -= 1;
    child.state = undefined;
    if (child.persistedAnchor === null && !child.measurements) {
      controlledChildren.delete(cellId);
    }
  };

  const notifyListeners = () => listeners.forEach((listener) => listener());

  const scheduleStateUpdateNotification = () => {
    if (stateUpdateRafId !== null) return;
    stateUpdateRafId = requestAnimationFrame(() => {
      stateUpdateRafId = null;
      notifyListeners();
    });
  };

  const getRowDistance = (child: ConnectedChildState): number => {
    if (child.cellId === restoringCellId) return -1;
    const root = getRootVirtualizer();
    const item = root?.measurementsCache[child.rowIndex];
    if (!root || !item) return Infinity;
    const viewportCenter = (root.scrollOffset ?? 0) + (root.scrollElement?.clientHeight ?? 0) / 2;
    return Math.abs(item.start + item.size / 2 - viewportCenter);
  };

  const getChildrenPendingActivation = () => {
    const pending: ConnectedChildState[] = [];
    for (const [cellId, { state }] of controlledChildren) {
      if (state && !activatedCells.has(cellId)) pending.push(state);
    }
    return pending;
  };

  const findChildState = (
    predicate: (state: ConnectedChildState, child: ChildEntry) => boolean
  ) => {
    for (const child of controlledChildren.values()) {
      if (child.state && predicate(child.state, child)) return child.state;
    }
  };

  const scheduleActivation = () => {
    if (!rootStable || staggerRafId !== null) return;
    if (getChildrenPendingActivation().length === 0) return;
    staggerRafId = requestAnimationFrame(() => {
      staggerRafId = null;
      // Re-read the queue: rows can move or unmount between animation frames.
      const next = getChildrenPendingActivation().sort(
        (left, right) => getRowDistance(left) - getRowDistance(right)
      )[0];

      if (next) {
        activatedCells.add(next.cellId);
        notifyListeners();
        scheduleActivation();
      }
    });
  };

  const register = (cellId: string, rowIndex: number) => {
    const child = getOrCreateChild(cellId);
    if (!child.state) registeredChildCount += 1;
    child.state = {
      ...(child.state ?? createDefaultChildState(cellId, rowIndex)),
      rowIndex,
    };

    if (rootStable && child.persistedAnchor !== null) {
      activatedCells.add(cellId);
    }

    scheduleActivation();
    return child;
  };

  const finishRestoration: ChildVirtualizerController['finishRestoration'] = (cellId) => {
    if (!restoringCellId || (cellId !== undefined && cellId !== restoringCellId)) return;
    controlledChildren.get(restoringCellId)?.handle?.cancelScroll?.();
    restoringCellId = undefined;
    getRootVirtualizer()?.cancelScroll();
    notifyListeners();
  };

  const enqueue: ChildVirtualizerController['enqueue'] = (cellId, rowIndex) => {
    const token = Symbol(cellId);
    enqueuedCells.set(cellId, token);
    register(cellId, rowIndex);
    notifyListeners();

    return () => {
      if (enqueuedCells.get(cellId) !== token) return;
      enqueuedCells.delete(cellId);
      if (!controlledChildren.get(cellId)?.handle) {
        releaseChild(cellId);
        notifyListeners();
      }
    };
  };

  const getScrollMarginForRow: ChildVirtualizerController['getScrollMarginForRow'] = (rowIndex) =>
    getRootVirtualizer()?.measurementsCache[rowIndex]?.start ?? 0;

  const getScrollElement: ChildVirtualizerController['getScrollElement'] = () =>
    getRootVirtualizer()?.scrollElement ?? null;

  const getInitialOffset: ChildVirtualizerController['getInitialOffset'] = () =>
    getRootVirtualizer()?.scrollElement?.scrollTop ?? getRootVirtualizer()?.scrollOffset ?? 0;

  const connect: ChildVirtualizerController['connect'] = (cellId, rowIndex, cancelScroll) => {
    const child = register(cellId, rowIndex);
    const token = Symbol(cellId);
    child.handle = { token, cancelScroll };
    if (child.state) {
      child.state = {
        ...child.state,
        scrollAnchorItemIndex: child.state.scrollAnchorItemIndex ?? child.persistedAnchor,
      };
    }
    const isCurrentHandle = () => controlledChildren.get(cellId)?.handle?.token === token;
    notifyListeners();

    return {
      reportState(patch) {
        if (!isCurrentHandle()) return;
        const { state } = child;
        if (!state) return;
        child.state = { ...state, ...patch };
        scheduleStateUpdateNotification();
      },
      detachScrollElement() {
        if (!isCurrentHandle()) return;

        const { state } = child;

        if (!state || state.isDetached) return;

        if (state.scrollAnchorItemIndex !== null) {
          child.persistedAnchor = state.scrollAnchorItemIndex;
        }

        child.state = { ...state, isDetached: true };
        finishRestoration(cellId);
        notifyListeners();
      },
      reattachScrollElement() {
        if (!isCurrentHandle()) return;
        const { state } = child;
        if (!state || !state.isDetached) return;
        child.state = { ...state, isDetached: false };
        notifyListeners();
      },
      disconnect() {
        if (!isCurrentHandle()) return;
        child.handle = undefined;
        const { state } = child;
        if (state?.scrollAnchorItemIndex != null && !state.isDetached) {
          child.persistedAnchor = state.scrollAnchorItemIndex;
        }
        releaseChild(cellId);
        notifyListeners();
        scheduleActivation();
      },
    };
  };

  return {
    enqueue,
    connect,
    getScrollElement,
    getInitialOffset,
    getScrollMarginForRow,
    getConnectedChildren,
    isDetached: (cellId) => controlledChildren.get(cellId)?.state?.isDetached ?? false,
    isRowDetached: (rowIndex) =>
      findChildState((state) => state.rowIndex === rowIndex && state.isDetached) !== undefined,
    hasDetachedChild: () => findChildState((state) => state.isDetached) !== undefined,
    isReturningCell: (cellId) => controlledChildren.get(cellId)?.persistedAnchor != null,
    // A returning cell has nothing to wait for, so it is active from its first render and skips the stagger.
    shouldActivate: (cellId) =>
      rootStable &&
      (activatedCells.has(cellId) || controlledChildren.get(cellId)?.persistedAnchor != null),
    get isRestoring() {
      return restoringCellId !== undefined;
    },
    markRootStable() {
      rootStable = true;
      notifyListeners();
      scheduleActivation();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getPersistedAnchor: (cellId) => controlledChildren.get(cellId)?.persistedAnchor ?? null,
    getRestoreAnchor: (cellId) =>
      rootStable && restoringCellId === cellId
        ? controlledChildren.get(cellId)?.persistedAnchor ?? null
        : null,
    finishRestoration,
    cancelRootScroll: () => getRootVirtualizer()?.cancelScroll(),
    // Only the registered children depend on the root's measurements (see `getScrollMarginForRow`), so a
    // change of the root is not worth a notification while there are none.
    notifyRootChange: () => {
      if (registeredChildCount > 0) scheduleStateUpdateNotification();
    },
    clearPersistedAnchor(cellId) {
      const child = controlledChildren.get(cellId);
      if (child) {
        child.persistedAnchor = null;
        child.measurements = undefined;
        releaseChild(cellId);
      }
      finishRestoration(cellId);
    },
    hasAttachedChildForRow: (rowIndex) =>
      findChildState(
        (state, { handle }) =>
          handle !== undefined && state.rowIndex === rowIndex && !state.isDetached
      ) !== undefined,
    getMeasurements(cellId, rows, layoutKey) {
      const cached = controlledChildren.get(cellId)?.measurements;
      return cached?.layoutKey === layoutKey && areSameRows(cached.rows, rows) ? cached.items : [];
    },
    saveMeasurements(cellId, snapshot) {
      getOrCreateChild(cellId).measurements = snapshot;
    },
    destroy() {
      if (staggerRafId !== null) cancelAnimationFrame(staggerRafId);
      if (stateUpdateRafId !== null) cancelAnimationFrame(stateUpdateRafId);
      staggerRafId = null;
      stateUpdateRafId = null;
    },
  };
};
