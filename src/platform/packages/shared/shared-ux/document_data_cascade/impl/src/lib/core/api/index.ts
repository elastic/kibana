/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import {
  useCallback,
  useLayoutEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { useDataCascadeState, type GroupNode, type LeafNode } from '../../../store_provider';
import { calculateActiveStickyIndex, type VirtualizerInstanceType } from '../virtualizer';
import type {
  DataCascadeUISnapshot,
  DataCascadeRestorableState,
  DataCascadeUISnapshotStore,
  UseExposePublicApiOptions,
  UseExposePublicApiReturnValue,
} from './types';

export type { DataCascadeRestorableState, DataCascadeUISnapshot };

const createDefaultUISnapshot = <G extends GroupNode, L extends LeafNode>(): DataCascadeUISnapshot<
  G,
  L
> => ({
  scrollOffset: 0,
  scrollRect: { width: 0, height: 0 },
  range: null,
  isScrolling: false,
  activeStickyIndex: null,
  totalRowCount: 0,
  totalSize: 0,
  expanded: {},
  rowSelection: {},
  scrollAnchorItemIndex: null,
  connectedChildren: {},
});

/**
 * Derives a {@link DataCascadeRestorableState} from a live snapshot,
 * keeping only the fields meaningful for restoration.
 */
export const toRestorableState = <G extends GroupNode, L extends LeafNode>(
  snapshot: DataCascadeUISnapshot<G, L>
): DataCascadeRestorableState => {
  const connectedChildren: DataCascadeRestorableState['connectedChildren'] = {};

  for (const [key, child] of Object.entries(snapshot.connectedChildren)) {
    connectedChildren[key] = {
      cellId: child.cellId,
      scrollAnchorItemIndex: child.scrollAnchorItemIndex,
      isConnected: !child.isDetached,
    };
  }

  return {
    expanded: typeof snapshot.expanded === 'object' ? snapshot.expanded : undefined,
    rowSelection: snapshot.rowSelection,
    scrollRect: snapshot.scrollRect,
    scrollAnchorItemIndex: snapshot.scrollAnchorItemIndex,
    connectedChildren,
  };
};

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
  const { rows } = options;
  const state = useDataCascadeState<G, L>();

  const expanded = useMemo<DataCascadeUISnapshot<G, L>['expanded']>(
    () => (typeof state.table.expanded === 'object' ? state.table.expanded : {}),
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

  // The store handed to consumers, its identity never changes.
  const store = useMemo<DataCascadeUISnapshotStore<G, L>>(() => {
    const getSnapshot = () => storeRef.current.snapshot;
    return {
      subscribe(onUISnapshotChange) {
        storeRef.current.listeners.add(onUISnapshotChange);
        return () => {
          storeRef.current.listeners.delete(onUISnapshotChange);
        };
      },
      getSnapshot,
      getServerSnapshot: getSnapshot,
    };
  }, []);

  const updateSnapshot = useCallback((patch: Partial<DataCascadeUISnapshot<G, L>>) => {
    storeRef.current.snapshot = { ...storeRef.current.snapshot, ...patch };
  }, []);

  const emitSnapshot = useCallback(() => {
    storeRef.current.listeners.forEach((listener) => listener());
  }, []);

  /** Notifies all subscribed listeners that the store snapshot may have changed. */
  const notifyListeners = useMemo(
    () =>
      debounce(() => {
        const opts = optionsRef.current;

        if (opts.isRestoring) return;

        const { expanded: exp, rowSelection: sel } = latestStateRef.current;

        updateSnapshot({ totalRowCount: opts.rows.length, expanded: exp, rowSelection: sel });
        emitSnapshot();
      }, 100),
    [updateSnapshot, emitSnapshot]
  );

  useEffect(() => () => notifyListeners.cancel(), [notifyListeners]);

  useEffect(() => {
    const childController = options.childController;

    if (!childController) return;

    return childController.subscribe(() => {
      if (optionsRef.current.isRestoring || childController.isRestoring) return;

      updateSnapshot({
        connectedChildren: Object.fromEntries(childController.getConnectedChildren()),
      });
      emitSnapshot();
    });
  }, [options.childController, updateSnapshot, emitSnapshot]);

  /** scans updates from virtualizer instance and updates the store snapshot. */
  const collectVirtualizerStateChanges = useCallback(
    (instance: VirtualizerInstanceType) => {
      const opts = optionsRef.current;

      if (opts.isRestoring) return;

      const range =
        instance.range != null
          ? { startIndex: instance.range.startIndex, endIndex: instance.range.endIndex }
          : null;
      const scrollOffset = instance.scrollOffset ?? 0;

      updateSnapshot({
        scrollOffset,
        ...(opts.childController
          ? { connectedChildren: Object.fromEntries(opts.childController.getConnectedChildren()) }
          : {}),
        range,
        isScrolling: instance.isScrolling ?? false,
        activeStickyIndex: calculateActiveStickyIndex(
          opts.rows,
          range?.startIndex ?? 0,
          opts.enableStickyGroupHeader
        ),
        scrollRect: instance.scrollRect ?? { width: 0, height: 0 },
        totalSize: instance.getTotalSize(),
        scrollAnchorItemIndex: instance.getVirtualItemForOffset(scrollOffset)?.index ?? null,
      });

      notifyListeners();
    },
    [notifyListeners, updateSnapshot]
  );

  useLayoutEffect(() => {
    notifyListeners();
  }, [notifyListeners, expanded, rowSelection, rows.length]);

  useImperativeHandle(ref, () => ({ getUISnapshotStore: () => store }), [store]);

  return { collectVirtualizerStateChanges };
}
