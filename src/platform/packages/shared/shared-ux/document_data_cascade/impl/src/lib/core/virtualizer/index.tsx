/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useMemo, useEffect, useLayoutEffect, useState } from 'react';
import { useVirtualizer, defaultRangeExtractor, measureElement } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';
import { createChildVirtualizerController } from './child_controller';
import { createVirtualizerApi } from './virtualizer_api';
import { useAnchorVirtualizerToItemIndex } from './use_scroll_restoration';
import type {
  VirtualizerRangeExtractorArgs,
  UseVirtualizerOptions,
  CascadeVirtualizerProps,
  CascadeVirtualizerReturnValue,
} from './types';
import { useControllerValue } from './use_connected_child_virtualizer';
import { calculateActiveStickyIndex } from './utils';

export { VirtualizedCascadeRowList, type VirtualizedCascadeListProps } from './component';
export { calculateActiveStickyIndex, useControllerValue };
export type {
  ChildVirtualizerController,
  ConnectedChildState,
  CascadeVirtualizerApi,
  CascadeVirtualizerProps,
  CascadeVirtualizerReturnValue,
  VirtualizerInstanceType,
} from './types';

/** Keys that scroll the list, natively or through the cascade's keyboard navigation. */
const SCROLLING_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/**
 * @internal
 * @description custom range extractor for cascade component, used to modify the range items the virtualizer displays,
 * we leverage it in this case to include group rows we'd like to render as sticky headings.
 * see {@link https://tanstack.com/virtual/v3/docs/api/virtualizer#rangeextractor} for more details
 */
export const useCascadeVirtualizerRangeExtractor = <G extends GroupNode>({
  rows,
  enableStickyGroupHeader,
}: VirtualizerRangeExtractorArgs<G>) => {
  return useCallback<NonNullable<UseVirtualizerOptions['rangeExtractor']>>(
    (range) => {
      if (!enableStickyGroupHeader) {
        return defaultRangeExtractor(range);
      }

      // Calculate the sticky index to include in the render range
      const activeStickyIndex = calculateActiveStickyIndex(rows, range.startIndex, true);

      const next = new Set(
        [activeStickyIndex, ...defaultRangeExtractor(range)].filter(Number.isInteger) as number[]
      );

      return Array.from(next).sort((a, b) => a - b);
    },
    [rows, enableStickyGroupHeader]
  );
};

/**
 * Virtualizes the cascade's own rows, and owns the controller that the virtualized content of its cells
 * connects to (see `useConnectedChildVirtualizer`).
 */
export const useCascadeVirtualizer = <G extends GroupNode>({
  rows,
  enableStickyGroupHeader,
  estimatedRowHeight = 0,
  initialAnchorItemIndex,
  initialPersistedAnchors,
  initialRestorationCellId,
  onStateChange,
  ...options
}: CascadeVirtualizerProps<G>): CascadeVirtualizerReturnValue => {
  const rootRef = useRef<CascadeVirtualizerReturnValue>();

  const [childController] = useState(() =>
    createChildVirtualizerController({
      getRootVirtualizer: () => rootRef.current,
      initialPersistedAnchors,
      initialRestorationCellId,
    })
  );

  const rangeExtractor = useCascadeVirtualizerRangeExtractor({ rows, enableStickyGroupHeader });
  const getItemKey = useCallback((index: number) => rows[index].id, [rows]);

  const instance = useVirtualizer({
    ...options,
    count: rows.length,
    estimateSize: () => estimatedRowHeight,
    getItemKey,
    rangeExtractor,
    measureElement(element, entry, virtualizer) {
      const index = virtualizer.indexFromElement(element);
      // A detached child is not in normal flow; retain its row's bounds so scrolling cannot unmount it.
      return childController.isRowDetached(index)
        ? virtualizer.measurementsCache[index]?.size ?? estimatedRowHeight
        : measureElement(element, entry, virtualizer);
    },
    onChange(virtualizer) {
      childController.notifyRootChange();
      onStateChange?.(virtualizer);
    },
  });

  const { isRestored, cancel } = useAnchorVirtualizerToItemIndex(instance, initialAnchorItemIndex);
  const isRestoringChild = useControllerValue(childController, (c) => c.isRestoring, false);
  const isStable = isRestored && !isRestoringChild;

  useLayoutEffect(() => {
    if (isRestored) {
      childController.markRootStable();
    }
  }, [isRestored, childController]);

  useEffect(() => {
    const element = instance.scrollElement;

    if (!element) return;

    const cancelRestoration = () => {
      cancel();
      childController.finishRestoration();
    };

    // Scrolling with the keyboard takes the position over from the restoration, like the wheel and touch do
    const cancelOnKey = (event: Event) => {
      if (event instanceof KeyboardEvent && SCROLLING_KEYS.has(event.key)) {
        cancelRestoration();
      }
    };

    element.addEventListener('wheel', cancelRestoration, { passive: true });
    element.addEventListener('touchstart', cancelRestoration, { passive: true });
    element.addEventListener('keydown', cancelOnKey);
    return () => {
      element.removeEventListener('wheel', cancelRestoration);
      element.removeEventListener('touchstart', cancelRestoration);
      element.removeEventListener('keydown', cancelOnKey);
    };
  }, [instance, instance.scrollElement, cancel, childController]);

  // The changes reported while restoring are intermediate, so the settled state is reported once it is reached
  useLayoutEffect(() => {
    if (isStable) {
      onStateChange?.(instance);
    }
  }, [isStable, instance, onStateChange]);

  useEffect(() => () => childController.destroy(), [childController]);

  instance.shouldAdjustScrollPositionOnItemSizeChange = (item) => {
    return (
      isStable &&
      !childController.hasAttachedChildForRow(item.index) &&
      item.start < (instance.scrollOffset ?? 0)
    );
  };

  const api = useMemo(
    // assigned onto the api rather than spread with it, so that its getters keep reading the live instance
    () => Object.assign(createVirtualizerApi(instance), { childController, isStable }),
    [instance, childController, isStable]
  );

  rootRef.current = api;

  return api;
};
