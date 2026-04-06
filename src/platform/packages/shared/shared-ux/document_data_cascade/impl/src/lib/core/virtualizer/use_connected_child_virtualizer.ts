/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Row } from '@tanstack/react-table';
import type { GroupNode } from '../../../store_provider';
import type {
  ChildConnectionHandle,
  ChildVirtualizerController,
} from './child_virtualizer_controller';
import { useCascadeVirtualizer, type CascadeVirtualizerReturnValue } from '.';

export interface UseConnectedChildVirtualizerOptions<G extends GroupNode> {
  controller: ChildVirtualizerController;
  cellId: string;
  rowIndex: number;
  rows: Row<G>[];
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

const EMPTY_ROWS: Row<GroupNode>[] = [];
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

  const childConfig = useMemo(() => controller.getChildConfig(rowIndex), [controller, rowIndex]);

  const persistedAnchor = useMemo(
    () => controller.getPersistedAnchor(cellId),
    [controller, cellId]
  );

  const handleRef = useRef<ChildConnectionHandle | null>(null);

  if (!handleRef.current) {
    handleRef.current = controller.connect(cellId, rowIndex);
  }

  const innerHandle = handleRef.current;

  const wrappedHandle = useMemo<ChildConnectionHandle>(
    () => ({
      reportState: innerHandle.reportState,
      disconnect: innerHandle.disconnect,
      detachScrollElement() {
        innerHandle.detachScrollElement();
        setIsDetached(true);
      },
      reattachScrollElement() {
        innerHandle.reattachScrollElement();
        setIsDetached(false);
      },
    }),
    [innerHandle]
  );

  useEffect(
    () => () => {
      innerHandle.disconnect();
      handleRef.current = null;
    },
    [innerHandle]
  );

  const onStateChange = useCallback<
    NonNullable<Parameters<typeof useCascadeVirtualizer>[0]['onStateChange']>
  >(
    (instance, didRestoreScrollPosition) => {
      if (!isActive || !didRestoreScrollPosition) return;
      const range = instance.range;
      innerHandle.reportState({
        scrollOffset: instance.scrollOffset ?? 0,
        range: range ? { startIndex: range.startIndex, endIndex: range.endIndex } : null,
        totalSize: instance.getTotalSize(),
        totalItemCount: instance.options.count,
        scrollAnchorItemIndex:
          instance.getVirtualItemForOffset(instance.scrollOffset!)?.index ?? null,
      });
    },
    [innerHandle, isActive]
  );

  const getScrollElement = useCallback(() => {
    if (isDetached && privateScrollElement?.current) {
      return privateScrollElement.current;
    }
    return childConfig.getScrollElement();
  }, [isDetached, privateScrollElement, childConfig]);

  const effectiveRows = isActive ? rows : (EMPTY_ROWS as Row<G>[]);

  const scrollMargin = isDetached ? 0 : controller.getScrollMarginForRow(rowIndex);

  const virtualizer = useCascadeVirtualizer<G>({
    rows: effectiveRows,
    enableStickyGroupHeader: false,
    estimatedRowHeight,
    overscan,
    isRoot: false,
    getScrollElement,
    scrollMargin,
    initialOffset: isDetached ? 0 : childConfig.initialOffset,
    initialAnchorItemIndex: persistedAnchor ?? undefined,
    onStateChange,
  });

  return useMemo(
    () => ({ virtualizer, handle: wrappedHandle, isActive, isDetached }),
    [virtualizer, wrappedHandle, isActive, isDetached]
  );
};
