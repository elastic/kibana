/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Row } from '@tanstack/react-table';
import { useCallback, useLayoutEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  useDataCascadeState,
  type GroupNode,
  type LeafNode,
  type IStoreState,
} from '../../../store_provider';
import {
  calculateActiveStickyIndex,
  type CascadeVirtualizerReturnValue,
  type UseVirtualizerReturnType,
} from '../virtualizer';

/**
 * Snapshot of data cascade ui state for use with useSyncExternalStore.
 * Includes virtualizer-derived state and specific table state.
 */
export interface DataCascadeUISnapshot<G extends GroupNode, L extends LeafNode>
  extends Pick<IStoreState<G, L>['table'], 'expanded' | 'rowSelection'> {
  scrollOffset: number;
  range: { startIndex: number; endIndex: number } | null;
  isScrolling: boolean;
  activeStickyIndex: number | null;
  totalRowCount: number;
  totalSize: number;
}

/**
 * useSyncExternalStore-compatible store for data cascade ui state.
 */
export interface DataCascadeUISnapshotStore<G extends GroupNode, L extends LeafNode> {
  subscribe(onStoreChange: () => void): () => void;
  getSnapshot(): DataCascadeUISnapshot<G, L>;
  getServerSnapshot(): DataCascadeUISnapshot<G, L>;
}

/**
 * Options for useExposePublicApi. Supplies table/UI state needed to build the snapshot.
 */
export interface UseExposePublicApiOptions<G extends GroupNode> {
  rows: Row<G>[];
  enableStickyGroupHeader: boolean;
}

/**
 * Return value of useExposePublicApi.
 */
export interface UseExposePublicApiReturnValue {
  /** Updates the store snapshot from virtualizer instance changes */
  collectVirtualizerStateChanges: (
    instance: UseVirtualizerReturnType | CascadeVirtualizerReturnValue | undefined
  ) => void;
}

const createDefaultUISnapshot = <G extends GroupNode, L extends LeafNode>(): DataCascadeUISnapshot<
  G,
  L
> => ({
  scrollOffset: 0,
  range: null,
  isScrolling: false,
  activeStickyIndex: null,
  totalRowCount: 0,
  totalSize: 0,
  expanded: {},
  rowSelection: {},
});

/**
 * Definition of the public API ref for the data cascade component.
 */
export interface DataCascadeImplRef<G extends GroupNode, L extends LeafNode> {
  /**
   * Returns helpers to access a minimal readonly state of the data cascade component.
   * This can be used as-is or put together leveraging useSyncExternalStore to create a more reactive
   * component state.
   *
   * @example
   * ```ts
   * export function useDataCascadeSnapshot(ref: React.RefObject<DataCascadeImplRef | null>): DataCascadeSnapshot {
   *   return useSyncExternalStore(
   *     (onStoreChange) => ref.current?.getUISnapshotStore()?.subscribe(onStoreChange) ?? (() => {}),
   *     () => ref.current?.getUISnapshotStore()?.getSnapshot() ?? DEFAULT_SNAPSHOT,
   *     () => ref.current?.getUISnapshotStore()?.getServerSnapshot() ?? DEFAULT_SNAPSHOT
   *   );
   * }
   * ```
   */
  getUISnapshotStore: () => DataCascadeUISnapshotStore<G, L> | null;
}

/**
 * Hook that owns the public API ref: aggregates state + virtualizer into a snapshot store,
 * updates the store when inputs change, and exposes getStateStore via useImperativeHandle.
 * Call from the cascade impl with the ref and options; the ref will be populated after mount.
 */
export function useExposePublicApi<G extends GroupNode, L extends LeafNode>(
  ref: React.Ref<DataCascadeImplRef<G, L>>,
  options: UseExposePublicApiOptions<G>
): UseExposePublicApiReturnValue {
  // Use a stable handle object and only update its method.
  const handleRef = useRef<DataCascadeImplRef<G, L>>({
    getUISnapshotStore: () => null,
  });

  const { rows } = options;
  const state = useDataCascadeState<G, L>();

  const expanded = useMemo<DataCascadeUISnapshot<G, L>['expanded']>(
    () =>
      typeof state.table.expanded === 'object' && state.table.expanded !== null
        ? state.table.expanded
        : {},
    [state.table.expanded]
  );

  const rowSelection = useMemo<DataCascadeUISnapshot<G, L>['rowSelection']>(
    () => state.table.rowSelection ?? {},
    [state.table.rowSelection]
  );

  const optionsRef = useRef(options);
  const latestStateRef = useRef({ expanded, rowSelection });
  optionsRef.current = options;
  latestStateRef.current = { expanded, rowSelection };

  const storeRef = useRef<{
    listeners: Set<() => void>;
    snapshot: DataCascadeUISnapshot<G, L>;
  }>({
    listeners: new Set(),
    snapshot: createDefaultUISnapshot(),
  });

  const subscribe = useCallback((onUISnapshotChange: () => void) => {
    storeRef.current.listeners.add(onUISnapshotChange);
    return () => {
      storeRef.current.listeners.delete(onUISnapshotChange);
    };
  }, []);

  const getSnapshot = useCallback((): DataCascadeUISnapshot<G, L> => storeRef.current.snapshot, []);
  const getServerSnapshot = useCallback(
    (): DataCascadeUISnapshot<G, L> => storeRef.current.snapshot,
    []
  );

  /** Notifies all subscribed listeners that the store snapshot may have changed. */
  const notifyListeners = useCallback(() => {
    const opts = optionsRef.current;
    const { expanded: exp, rowSelection: sel } = latestStateRef.current;
    const snap = storeRef.current.snapshot;

    snap.totalRowCount = opts.rows.length;
    snap.expanded = exp;
    snap.rowSelection = sel;

    storeRef.current.listeners.forEach((listener) => listener());
  }, []);

  /** scans updates from virtualizer instance and updates the store snapshot. */
  const collectVirtualizerStateChanges = useCallback(
    (instance: UseVirtualizerReturnType | CascadeVirtualizerReturnValue | undefined) => {
      const opts = optionsRef.current;
      const snap = storeRef.current.snapshot;
      // if the virtualizer instance is not null, update the store snapshot
      if (instance != null) {
        const range =
          instance.range != null
            ? { startIndex: instance.range.startIndex, endIndex: instance.range.endIndex }
            : null;
        const activeStickyIndex = calculateActiveStickyIndex(
          opts.rows,
          range?.startIndex ?? 0,
          opts.enableStickyGroupHeader
        );
        snap.scrollOffset = instance.scrollOffset ?? 0;
        snap.range = range;
        snap.isScrolling = instance.isScrolling ?? false;
        snap.activeStickyIndex = activeStickyIndex;
        snap.totalSize = instance.getTotalSize ? instance.getTotalSize() : 0;

        notifyListeners();
      }
    },
    [notifyListeners]
  );

  useLayoutEffect(() => {
    notifyListeners();
  }, [notifyListeners, expanded, rowSelection, rows.length]);

  const getStateStore = useCallback(
    (): DataCascadeUISnapshotStore<G, L> => ({
      subscribe,
      getSnapshot,
      getServerSnapshot,
    }),
    [subscribe, getSnapshot, getServerSnapshot]
  );

  handleRef.current = {
    getUISnapshotStore: getStateStore,
  };

  // Magic happens here, the ref is populated after mount and consumers can use it to access the public API
  useImperativeHandle(ref, () => handleRef.current, []);

  return { collectVirtualizerStateChanges };
}
