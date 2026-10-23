/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { Row } from '@tanstack/react-table';
import type { GroupNode } from '../../../store_provider';
import type {
  ChildConnectionHandle,
  ChildVirtualizerController,
  ConnectedChildState,
} from './child_virtualizer_controller';
import {
  useCascadeVirtualizer,
  type CascadeVirtualizerReturnValue,
  type UseVirtualizerReturnType,
} from '.';

export interface UseConnectedChildVirtualizerOptions<G extends GroupNode = GroupNode> {
  controller: ChildVirtualizerController;
  /**
   * Identifies this connection within the controller. A cell can hold several
   * connections at once (e.g. alternate views of its content) as long as each
   * one uses its own id. Changing the id reconnects and restarts scroll restoration.
   */
  cellId: string;
  /**
   * Index of the row in the cascade's root virtualizer, as provided to the cell render prop.
   * Changing it reconnects for the new row while keeping the scroll position.
   */
  rowIndex: number;
  /**
   * Items rendered by the child virtualizer. Only the length and each item's `id` are read.
   */
  rows: ReadonlyArray<Pick<Row<G>, 'id'>>;
  estimatedRowHeight?: number;
  overscan?: number;
  /**
   * When detached, the child uses this element as its own scroll container.
   * If not provided, the child cannot detach.
   */
  privateScrollElement?: React.RefObject<Element | null>;
}

export interface UseConnectedChildVirtualizerResult {
  virtualizer: CascadeVirtualizerReturnValue;
  handle: ChildConnectionHandle;
  isActive: boolean;
  isDetached: boolean;
}

const EMPTY_ROWS: ReadonlyArray<Pick<Row<GroupNode>, 'id'>> = [];

/**
 * The item at the top of the viewport and the offset of the viewport's top within it, or `null`
 * when none of the items intersect the viewport: such a connection has no position of its own to
 * restore, it is the cascade's position that places it. The offset is negative for a viewport that
 * starts above the first item (e.g. at the row header above the items), so that the restored
 * position keeps the same distance to it.
 */
const getScrollAnchor = (instance: UseVirtualizerReturnType) => {
  const { measurementsCache } = instance;
  const firstItem = measurementsCache[0];
  const lastItem = measurementsCache[measurementsCache.length - 1];
  if (!firstItem || !lastItem) return null;

  const scrollOffset = instance.scrollOffset ?? 0;
  const viewportEnd = scrollOffset + (instance.scrollRect?.height ?? 0);
  if (scrollOffset >= lastItem.end || viewportEnd <= firstItem.start) return null;

  const anchorItem = instance.getVirtualItemForOffset(scrollOffset);
  return anchorItem ? { index: anchorItem.index, offset: scrollOffset - anchorItem.start } : null;
};
const getActivation = (controller: ChildVirtualizerController, rowIndex: number) =>
  controller.shouldActivate(rowIndex);

export const useConnectedChildVirtualizer = <G extends GroupNode>({
  controller,
  cellId,
  rowIndex,
  rows,
  estimatedRowHeight,
  overscan,
  privateScrollElement,
}: UseConnectedChildVirtualizerOptions<G>): UseConnectedChildVirtualizerResult => {
  const isActive = useSyncExternalStore(
    controller.subscribe,
    () => getActivation(controller, rowIndex),
    () => false
  );

  const [isDetached, setIsDetached] = useState(false);
  const isDetachedRef = useRef(isDetached);
  isDetachedRef.current = isDetached;

  const childConfig = useMemo(() => controller.getChildConfig(rowIndex), [controller, rowIndex]);

  const { persistedAnchor, persistedAnchorOffset } = useMemo(
    () => ({
      persistedAnchor: controller.getPersistedAnchor(cellId),
      persistedAnchorOffset: controller.getPersistedAnchorOffset(cellId),
    }),
    [controller, cellId]
  );

  const handleRef = useRef<ChildConnectionHandle | null>(null);

  // Connect in a layout effect, so the connection exists before the first frame of this
  // connection identity is painted, and reconnect whenever the identity changes. The previous
  // connection is released in a passive cleanup (below), which React runs after the layout
  // effects of the same commit: a connection that replaces this one for the same row is thereby
  // registered before this one goes away, which keeps the row activated across the swap.
  useLayoutEffect(() => {
    const handle = controller.connect(cellId, rowIndex);
    if (isDetachedRef.current) {
      handle.detachScrollElement();
    }
    handleRef.current = handle;
  }, [controller, cellId, rowIndex]);

  useEffect(() => {
    const handle = handleRef.current;
    return () => {
      handle?.disconnect();
      if (handleRef.current === handle) {
        handleRef.current = null;
      }
    };
  }, [controller, cellId, rowIndex]);

  const wrappedHandle = useMemo<ChildConnectionHandle>(
    () => ({
      reportState: (patch) => handleRef.current?.reportState(patch),
      disconnect: () => handleRef.current?.disconnect(),
      detachScrollElement() {
        handleRef.current?.detachScrollElement();
        setIsDetached(true);
      },
      reattachScrollElement() {
        handleRef.current?.reattachScrollElement();
        setIsDetached(false);
      },
    }),
    []
  );

  const onStateChange = useCallback<
    NonNullable<Parameters<typeof useCascadeVirtualizer>[0]['onStateChange']>
  >(
    (instance, didRestoreScrollPosition, didStabilize) => {
      if (!isActive || !didRestoreScrollPosition) return;
      const range = instance.range;

      const patch: Partial<ConnectedChildState> = {
        scrollOffset: instance.scrollOffset ?? 0,
        range: range ? { startIndex: range.startIndex, endIndex: range.endIndex } : null,
        totalSize: instance.getTotalSize(),
        totalItemCount: instance.options.count,
      };

      // Only persist the scroll anchor after corrections have converged.
      // Before stabilization the offset is intermediate and would cause the
      // persisted anchor to capture a wrong position on disconnect/detach.
      if (didStabilize) {
        const anchor = getScrollAnchor(instance);
        patch.scrollAnchorItemIndex = anchor?.index ?? null;
        patch.scrollAnchorItemOffset = anchor?.offset ?? null;
        patch.hasStabilized = true;
      }

      handleRef.current?.reportState(patch);
    },
    [isActive]
  );

  const getScrollElement = useCallback(() => {
    if (isDetached && privateScrollElement?.current) {
      return privateScrollElement.current;
    }
    return childConfig.getScrollElement();
  }, [isDetached, privateScrollElement, childConfig]);

  // child virtualizers only read `rows.length` and `rows[index].id`, see `useCascadeVirtualizer`
  const effectiveRows = (isActive ? rows : EMPTY_ROWS) as Row<G>[];

  const scrollMargin = isDetached ? 0 : controller.getScrollMarginForRow(rowIndex);

  // there is nothing to restore in an active connection without items (e.g. its data disappeared)
  const initialAnchorItemIndex =
    isActive && rows.length === 0 ? undefined : persistedAnchor ?? undefined;

  const virtualizer = useCascadeVirtualizer<G>({
    rows: effectiveRows,
    enableStickyGroupHeader: false,
    estimatedRowHeight,
    overscan,
    isRoot: false,
    getScrollElement,
    scrollMargin,
    initialOffset: isDetached ? 0 : childConfig.initialOffset,
    initialAnchorItemIndex,
    initialAnchorItemOffset: persistedAnchorOffset,
    // a new connection id restores from its own persisted anchor, whereas a cell that merely moved to
    // another row keeps its position
    scrollRestorationKey: cellId,
    onStateChange,
  });

  // Report stabilization even when no scroll or measurement event follows it (e.g. a connection
  // without items), so that the controller never waits for this connection indefinitely; the
  // virtualizer's stability is itself bounded by a timeout.
  const isVirtualizerStable = virtualizer.isStable;
  useEffect(() => {
    if (isActive && isVirtualizerStable) {
      handleRef.current?.reportState({ hasStabilized: true });
    }
  }, [isActive, isVirtualizerStable]);

  return useMemo(
    () => ({ virtualizer, handle: wrappedHandle, isActive, isDetached }),
    [virtualizer, wrappedHandle, isActive, isDetached]
  );
};
