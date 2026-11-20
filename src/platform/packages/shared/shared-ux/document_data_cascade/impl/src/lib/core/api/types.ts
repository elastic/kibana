/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GroupNode, LeafNode, IStoreState } from '../../../store_provider';
import type { CascadeTableRow } from '../table';
import type {
  VirtualizerInstanceType,
  ConnectedChildState,
  ChildVirtualizerController,
} from '../virtualizer';

/**
 * Snapshot of data cascade ui state for use with useSyncExternalStore.
 * Includes virtualizer-derived state and specific table state.
 */
export interface DataCascadeUISnapshot<
  G extends GroupNode = GroupNode,
  L extends LeafNode = LeafNode
> extends Pick<IStoreState<G, L>['table'], 'expanded' | 'rowSelection'> {
  scrollRect: { width: number; height: number };
  scrollOffset: number;
  range: { startIndex: number; endIndex: number } | null;
  isScrolling: boolean;
  activeStickyIndex: number | null;
  totalRowCount: number;
  totalSize: number;
  /**
   * The index of the topmost virtual item that is currently in view,
   * value is a derivative of the virtualizer's current scroll offset.
   */
  scrollAnchorItemIndex: number | null;
  /**
   * State of all child virtualizers connected via the controller.
   * Empty when no children are connected.
   */
  connectedChildren: Readonly<Record<string, ConnectedChildState>>;
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
  rows: Array<CascadeTableRow<G>>;
  enableStickyGroupHeader: boolean;
  childController?: ChildVirtualizerController | null;
  isRestoring?: boolean;
}

/**
 * Return value of useExposePublicApi.
 */
export interface UseExposePublicApiReturnValue {
  /** Updates the store snapshot from virtualizer instance changes */
  collectVirtualizerStateChanges: (instance: VirtualizerInstanceType) => void;
}

/**
 * Serializable subset of {@link DataCascadeUISnapshot} that a consumer can
 * persist and pass back as `initialState` to restore the component.
 */
export interface DataCascadeRestorableState {
  expanded?: Record<string, boolean>;
  rowSelection?: Record<string, boolean>;
  scrollRect?: { width: number; height: number };
  scrollAnchorItemIndex?: number | null;
  connectedChildren?: Record<
    string,
    Pick<ConnectedChildState, 'cellId' | 'scrollAnchorItemIndex'> & { isConnected: boolean }
  >;
}
