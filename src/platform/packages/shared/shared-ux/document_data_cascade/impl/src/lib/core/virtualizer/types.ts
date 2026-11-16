/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import type { VirtualItem, Virtualizer, useVirtualizer } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';
import type { CascadeTableRow } from '../table';

export type VirtualizerInstanceType = Virtualizer<Element, Element>;

export type UseVirtualizerOptions = Parameters<typeof useVirtualizer>[0];

export interface CascadeVirtualizerProps<G extends GroupNode>
  extends Pick<UseVirtualizerOptions, 'getScrollElement' | 'overscan' | 'initialRect'> {
  rows: Array<CascadeTableRow<G>>;
  /**
   * setting a value of true causes the active group root row
   * to stick right under the header
   */
  enableStickyGroupHeader: boolean;
  estimatedRowHeight?: number;
  /**
   * The index of the item that should be anchored to the top of the virtualizer.
   */
  initialAnchorItemIndex?: number;
  /**
   * Called whenever the virtualizer updates (scroll, range, size, etc.), and once more when a restoration
   * settles. Used to conduit values into external state (e.g. public API store). Updates also arrive while a
   * saved position is being restored, see `isStable` on the returned value.
   */
  onStateChange?: (instance: VirtualizerInstanceType) => void;
  /**
   * Pre-seeds persisted scroll anchors into the child virtualizer controller
   * for saved-state compatibility; only initialRestorationCellId restores the viewport.
   */
  initialPersistedAnchors?: Record<string, number | null>;
  initialRestorationCellId?: string;
}

export interface VirtualizerRangeExtractorArgs<G extends GroupNode> {
  rows: Array<CascadeTableRow<G>>;
  enableStickyGroupHeader: boolean;
}

/**
 * The part of a virtualizer that the root and the child virtualizers both expose.
 */
export interface CascadeVirtualizerApi
  extends Pick<
    VirtualizerInstanceType,
    | 'getTotalSize'
    | 'getVirtualItems'
    | 'isScrolling'
    | 'measureElement'
    | 'scrollOffset'
    | 'scrollElement'
    | 'range'
    | 'measurementsCache'
    | 'scrollToIndex'
    | 'measure'
    | 'scrollToOffset'
    | 'takeSnapshot'
    | 'cancelScroll'
    | 'scrollRect'
  > {
  scrollToVirtualizedIndex: (
    offset: number,
    options: {
      adjustments?: number;
      behavior?: Exclude<ScrollBehavior, 'instant'>;
    }
  ) => void;
}

/**
 * Return value of {@link useCascadeVirtualizer}, the virtualizer of the cascade's own rows.
 */
export interface CascadeVirtualizerReturnValue extends CascadeVirtualizerApi {
  childController: ChildVirtualizerController;
  /** False while a saved scroll position is still being restored. */
  isStable: boolean;
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

export interface VirtualizerItem {
  id: string;
}

export interface ChildMeasurements {
  rows: readonly VirtualizerItem[];
  layoutKey: string;
  items: VirtualItem[];
}

export interface ChildVirtualizerController {
  enqueue(cellId: string, rowIndex: number): () => void;
  isReturningCell(cellId: string): boolean;
  /** The scroll element the children share with the root. */
  getScrollElement(): Element | null;
  /** The scroll offset a child that mounts now starts from. */
  getInitialOffset(): number;
  getScrollMarginForRow(rowIndex: number): number;
  connect(cellId: string, rowIndex: number, cancelScroll?: () => void): ChildConnectionHandle;
  /** A copy of the state of every registered child, for the public snapshot. */
  getConnectedChildren(): ReadonlyMap<string, ConnectedChildState>;
  /** Whether the child of this cell has left the shared scroll element, e.g. for fullscreen. */
  isDetached(cellId: string): boolean;
  /** Whether the child rendered in this root row is detached. */
  isRowDetached(rowIndex: number): boolean;
  hasDetachedChild(): boolean;
  shouldActivate(cellId: string): boolean;
  readonly isRestoring: boolean;
  markRootStable(): void;
  subscribe(listener: () => void): () => void;
  /** The anchor a cell had when it last disconnected or detached, which marks it as a returning cell. */
  getPersistedAnchor(cellId: string): number | null;
  getRestoreAnchor(cellId: string): number | null;
  finishRestoration(cellId?: string): void;
  cancelRootScroll(): void;
  notifyRootChange(): void;
  clearPersistedAnchor(cellId: string): void;
  hasAttachedChildForRow(rowIndex: number): boolean;
  getMeasurements(
    cellId: string,
    rows: readonly VirtualizerItem[],
    layoutKey: string
  ): VirtualItem[];
  saveMeasurements(cellId: string, measurements: ChildMeasurements): void;
  destroy(): void;
}

export interface CreateChildVirtualizerControllerOptions {
  getRootVirtualizer: () => CascadeVirtualizerApi | undefined;
  /**
   * Pre-seeds persisted scroll anchors into the child virtualizer controller,
   * Will only contain more than one entry when `allowMultipleRowToggle` is true.
   */
  initialPersistedAnchors?: Record<string, number | null>;
  initialRestorationCellId?: string;
}

export interface UseConnectedChildVirtualizerOptions<T extends VirtualizerItem> {
  controller: ChildVirtualizerController;
  cellId: string;
  rowIndex: number;
  rows: readonly T[];
  measurementKey?: string;
  estimatedRowHeight?: number;
  overscan?: number;
  /**
   * Distance between the top of the root row and the top of the child's virtualized content
   * (e.g. the row header and any chrome rendered above the list). Added to the row's start so
   * that the child's item positions map onto their actual place in the shared scroll element.
   */
  scrollMarginOffset?: number;
  /**
   * Space at the top of the shared scroll element that is covered by other content (e.g. a
   * sticky header), which `scrollToIndex` should keep items clear of.
   */
  scrollPaddingStart?: number;
  /**
   * Space at the bottom of the shared scroll element that `scrollToIndex` should keep items clear of.
   */
  scrollPaddingEnd?: number;
  /**
   * When detached, the child uses this element as its own scroll container.
   * If not provided, the child cannot detach.
   */
  privateScrollElement?: RefObject<Element | null>;
}

export interface UseConnectedChildVirtualizerResult {
  virtualizer: CascadeVirtualizerApi;
  handle: Pick<ChildConnectionHandle, 'detachScrollElement' | 'reattachScrollElement'>;
  isDetached: boolean;
}
