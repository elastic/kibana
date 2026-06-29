/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type CSSProperties,
  Fragment,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { type Row } from '@tanstack/react-table';
import { useVirtualizer, defaultRangeExtractor, type VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';
import {
  createChildVirtualizerController,
  type ChildVirtualizerController,
} from './child_virtualizer_controller';

type UseVirtualizerOptions = Parameters<typeof useVirtualizer>[0];
type UseVirtualizerReturnType = ReturnType<typeof useVirtualizer>;

export type { ChildVirtualizerController, UseVirtualizerReturnType };

export interface CascadeVirtualizerProps<G extends GroupNode>
  extends Pick<
    UseVirtualizerOptions,
    | 'getScrollElement'
    | 'overscan'
    | 'initialOffset'
    | 'initialRect'
    | 'scrollMargin'
    | 'observeElementOffset'
    | 'observeElementRect'
  > {
  rows: Row<G>[];
  /**
   * setting a value of true causes the active group root row
   * to stick right under the header
   */
  enableStickyGroupHeader: boolean;
  estimatedRowHeight?: number;
  initialAnchorItemIndex?: number;
  /**
   * When true (default), creates a {@link ChildVirtualizerController}
   * that child virtualizers can connect to. Set to false when this
   * virtualizer is itself a child managed by a controller.
   */
  isRoot?: boolean;
  /**
   * Called whenever the virtualizer updates (scroll, range, size, etc.).
   * Used to conduit values into external state (e.g. public API store).
   *
   * @param didStabilize - true once post-measurement corrections have converged.
   *   Until then, scroll offset and derived values (e.g. anchor indices) may be
   *   intermediate and should not be persisted.
   */
  onStateChange?: (
    instance: UseVirtualizerReturnType,
    didRestoreScrollPosition: boolean,
    didStabilize: boolean
  ) => void;
  /**
   * Pre-seeds persisted scroll anchors into the child virtualizer controller
   * so that children can restore their scroll positions on remount.
   * Only meaningful when {@link isRoot} is true.
   */
  initialPersistedAnchors?: Record<string, number | null>;
}

export interface UseVirtualizedRowScrollStateStoreOptions {
  /**
   * Function to get the parent virtualizer instance
   */
  getVirtualizer: () => ReturnType<typeof useCascadeVirtualizer>;
  /**
   * The index of the current row in the parent virtualizer
   */
  rowIndex: number;
}

export interface VirtualizedRowScrollState {
  scrollOffset: number;
  scrollMargin: number;
}

export interface VirtualizedCascadeListProps<G extends GroupNode>
  extends Pick<
    CascadeVirtualizerReturnValue,
    'virtualizedRowComputedTranslateValue' | 'getVirtualItems'
  > {
  rows: Row<G>[];
  activeStickyIndex: number | null;
  listItemRenderer: (props: {
    isActiveSticky: boolean;
    virtualItem: VirtualItem;
    virtualRowStyle: React.CSSProperties;
    row: Row<G>;
  }) => React.ReactNode;
}

/**
 * Calculates the active sticky index from the current visible range.
 * Idea here is to find the nearest expanded parent index
 * and add the index of the current row to the range of visible items rendered to the user.
 * This should be called directly in the consuming component to ensure the value
 * is always current and never stale due to intermediate memoization.
 */
export function calculateActiveStickyIndex<G extends GroupNode>(
  rows: Row<G>[],
  startIndex: number,
  enableStickyGroupHeader: boolean
): number | null {
  if (!enableStickyGroupHeader) {
    return null;
  }

  const rangeStartRow = rows[startIndex];
  if (!rangeStartRow) {
    return null;
  }

  const rangeStartParentRows = rangeStartRow.getParentRows();

  if (!rangeStartParentRows.length && !rangeStartRow.getIsExpanded()) {
    return null;
  }

  if (!rangeStartParentRows.length && rangeStartRow.getIsExpanded()) {
    return rangeStartRow.index;
  }

  const nearestExpandedParentIndex = rangeStartParentRows.reduce<number>((acc, row, idx) => {
    return (acc += row.index + idx);
  }, 0);

  const isExpandedLeafRow = !rangeStartRow.subRows.length && rangeStartRow.getIsExpanded();

  return isExpandedLeafRow
    ? // we add 1 to the index to account for the fact that
      // we get an zero based index for children in relation to the parent
      nearestExpandedParentIndex + rangeStartRow.index + 1
    : nearestExpandedParentIndex;
}

export interface CascadeVirtualizerReturnValue
  extends Pick<
    UseVirtualizerReturnType,
    | 'getTotalSize'
    | 'getVirtualItems'
    | 'isScrolling'
    | 'measureElement'
    | 'scrollOffset'
    | 'scrollElement'
    | 'range'
    | 'measurementsCache'
    | 'calculateRange'
  > {
  virtualizedRowComputedTranslateValue: Map<number, number>;
  virtualizedRowsSizeCache: Map<string, number>;
  scrollToVirtualizedIndex: (
    offset: number,
    options: {
      adjustments?: number;
      behavior?: Exclude<ScrollBehavior, 'instant'>;
    }
  ) => void;
  scrollToLastVirtualizedRow: () => void;
  childController: ChildVirtualizerController | null;
  isStable: boolean;
}

/**
 * Narrowed return type for {@link useCascadeVirtualizer} when `isRoot` is `true`.
 * Guarantees that `childController` is always defined.
 */
export type CascadeRootVirtualizerReturnValue = Omit<
  CascadeVirtualizerReturnValue,
  'childController'
> & {
  childController: ChildVirtualizerController;
};

interface UseCascadeVirtualizer {
  <G extends GroupNode>(
    props: Omit<CascadeVirtualizerProps<G>, 'isRoot'> & { isRoot: true }
  ): CascadeRootVirtualizerReturnValue;
  <G extends GroupNode>(props: CascadeVirtualizerProps<G>): CascadeVirtualizerReturnValue;
}

export interface VirtualizerRangeExtractorArgs<G extends GroupNode> {
  rows: Row<G>[];
  enableStickyGroupHeader: boolean;
}

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
 * @internal
 * Anchors the scroll position of the virtualizer to the given item index on initial render.
 *
 * The hook watches `virtualizer.options.count` so that it re-fires when a
 * child virtualizer transitions from 0 items (inactive) to N items (active).
 * Without this, the `useLayoutEffect` would not re-run because the virtualizer
 * instance is a stable mutable reference.
 *
 * Post-measurement corrections run in a `requestAnimationFrame` loop that is
 * decoupled from React's render cycle. This avoids wasting correction budget
 * on unrelated re-renders and eliminates feedback loops between corrections
 * and tanstack's `onChange` callback.
 */
export const useAnchorVirtualizerToItemIndex = (
  virtualizer: UseVirtualizerReturnType,
  itemIndex: number,
  options?: {
    hasRestoredScrollPositionRef?: React.MutableRefObject<boolean>;
    hasStabilizedRef?: React.MutableRefObject<boolean>;
    skipCorrections?: boolean;
  }
) => {
  const internalRestoredRef = useRef<boolean>(false);
  const internalStabilizedRef = useRef<boolean>(false);
  const resolvedRef = options?.hasRestoredScrollPositionRef ?? internalRestoredRef;
  const stabilizedRef = options?.hasStabilizedRef ?? internalStabilizedRef;
  const itemCount = virtualizer.options.count;
  const skipCorrections = options?.skipCorrections ?? false;

  const restoreScrollOffset = useCallback(() => {
    if (resolvedRef.current || !virtualizer || itemCount === 0) return;

    if (!Boolean(itemIndex)) {
      resolvedRef.current = true;
      return;
    }

    performance.mark('anchorVirtualizerToItemIndex:start', {
      detail: {
        devtools: {
          dataType: 'marker',
          color: 'primary',
          tooltip: 'anchorVirtualizerToItemIndex:start',
        },
      },
    });
    const offsetItemCache = virtualizer.measurementsCache[itemIndex];

    if (!offsetItemCache) return;

    // measurementsCache[N].start already includes scrollMargin (tanstack adds
    // paddingStart + scrollMargin to the first item, and chains from there),
    // so it is the absolute position within the shared scroll container.
    const targetOffset = offsetItemCache.start;
    const scrollOffset = virtualizer.scrollOffset ?? 0;
    const adjustments = targetOffset - scrollOffset;

    virtualizer.options.scrollToFn(scrollOffset, { behavior: undefined, adjustments }, virtualizer);

    virtualizer.scrollOffset = targetOffset;
    resolvedRef.current = true;

    performance.measure('anchorVirtualizerToItemIndex', {
      detail: {
        devtools: {
          dataType: 'marker',
          color: 'primary',
          tooltip: 'anchorVirtualizerToItemIndex',
        },
      },
      start: 'anchorVirtualizerToItemIndex:start',
      end: performance.now(),
    });
  }, [itemIndex, itemCount, resolvedRef, virtualizer]);

  useLayoutEffect(() => {
    restoreScrollOffset();
  }, [restoreScrollOffset]);

  // Post-measurement correction loop. Runs in requestAnimationFrame frames
  // outside of React's render cycle so corrections are applied exactly when
  // the browser has finished layout/paint and measurements are up-to-date.
  //
  // When `skipCorrections` is true the virtualizer yields correction
  // authority to another virtualizer (e.g. root yields to a child that has
  // a persisted scroll anchor, since both share the same scroll element).
  useEffect(() => {
    if (skipCorrections || !Boolean(itemIndex)) {
      stabilizedRef.current = true;
      return;
    }

    if (itemCount === 0) return;

    let budget = MAX_SCROLL_ANCHOR_CORRECTIONS;
    let rafId: number | null = null;

    const correct = () => {
      rafId = null;

      if (budget <= 0) {
        stabilizedRef.current = true;
        return;
      }

      const offsetItemCache = virtualizer.measurementsCache[itemIndex];
      if (!offsetItemCache) {
        budget -= 1;
        rafId = requestAnimationFrame(correct);
        return;
      }

      const targetOffset = offsetItemCache.start;
      const currentOffset = virtualizer.scrollOffset ?? 0;

      if (Math.abs(targetOffset - currentOffset) <= 1) {
        resolvedRef.current = true;
        stabilizedRef.current = true;
        return;
      }

      budget -= 1;
      virtualizer.options.scrollToFn(
        currentOffset,
        { behavior: undefined, adjustments: targetOffset - currentOffset },
        virtualizer
      );
      virtualizer.scrollOffset = targetOffset;
      resolvedRef.current = true;

      rafId = requestAnimationFrame(correct);
    };

    rafId = requestAnimationFrame(correct);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [skipCorrections, itemIndex, itemCount, virtualizer, resolvedRef, stabilizedRef]);
};

/**
 * Maximum number of post-measurement scroll corrections allowed after the
 * initial anchor restoration. This caps the correction loop so it cannot
 * run indefinitely when measurements keep changing.
 */
const MAX_SCROLL_ANCHOR_CORRECTIONS = 5;

/**
 * @internal
 * Defers overscan to zero on the initial render frame to reduce DOM node count
 * and layout thrashing during mount. After the browser paints, the configured
 * overscan is applied directly to the virtualizer options without triggering
 * a React re-render.
 *
 * @returns An object with `initialOverscan` for the first render and an
 * `applyDeferredOverscan` callback to invoke once the virtualizer is created.
 */
const useDeferredOverscan = (overscan: number | undefined, skip: boolean) => {
  const overscanAppliedRef = useRef(skip);
  const resolvedOverscan = overscan ?? 1;
  const initialOverscan = overscanAppliedRef.current ? resolvedOverscan : 0;

  const applyDeferredOverscan = useCallback(
    (virtualizerInstance: UseVirtualizerReturnType) => {
      if (overscanAppliedRef.current) return;

      const rafId = requestAnimationFrame(() => {
        overscanAppliedRef.current = true;
        virtualizerInstance.options.overscan = resolvedOverscan;
      });

      return () => cancelAnimationFrame(rafId);
    },
    [resolvedOverscan]
  );

  return { initialOverscan, applyDeferredOverscan };
};

export const useCascadeVirtualizer = (<G extends GroupNode>({
  overscan,
  enableStickyGroupHeader,
  estimatedRowHeight = 0,
  rows,
  getScrollElement,
  onStateChange,
  initialOffset,
  initialRect,
  scrollMargin,
  initialAnchorItemIndex,
  isRoot = true,
  observeElementOffset,
  observeElementRect,
  initialPersistedAnchors,
}: CascadeVirtualizerProps<G>): CascadeVirtualizerReturnValue => {
  const hasRestoredScrollPositionRef = useRef(false);
  const hasStabilizedRef = useRef(false);
  const virtualizedRowsSizeCacheRef = useRef<Map<string, number>>(new Map());
  /**
   * Records the computed translate value for each item of virtualized row
   */
  const virtualizedRowComputedTranslateValueRef = useRef(new Map<number, number>());

  const virtualizerReturnValueRef = useRef<CascadeVirtualizerReturnValue | undefined>(undefined);
  const childControllerRef = useRef<ChildVirtualizerController | null>(null);
  const { initialOverscan, applyDeferredOverscan } = useDeferredOverscan(
    overscan,
    // Skip deferred overscan (use full overscan immediately) when this is a
    // non-root virtualizer OR when we need to restore a scroll anchor. During
    // restoration, the virtualizer must measure enough items around the anchor
    // before the first `useLayoutEffect` fires so that initial position
    // estimates are as accurate as possible.
    !isRoot || Boolean(initialAnchorItemIndex)
  );

  const rangeExtractor = useCascadeVirtualizerRangeExtractor<G>({
    rows,
    enableStickyGroupHeader,
  });

  // Determined once at creation: when persisted child anchors exist the root
  // yields post-measurement corrections to the child virtualizer, since both
  // share the same scroll element and the child is closer to the user's
  // actual scroll context.
  const hasPersistedChildAnchors =
    initialPersistedAnchors != null &&
    Object.values(initialPersistedAnchors).some((v) => v != null);
  const hasPersistedChildAnchorsRef = useRef(hasPersistedChildAnchors);

  if (isRoot && !childControllerRef.current) {
    childControllerRef.current = createChildVirtualizerController({
      getRootVirtualizer: () => virtualizerReturnValueRef.current,
      initialPersistedAnchors,
    });
  }

  const childController = isRoot ? childControllerRef.current : null;

  const getItemKey = useCallback((index: number) => rows[index]?.id ?? String(index), [rows]);

  const virtualizerOptions = useMemo<UseVirtualizerOptions>(
    () => ({
      count: rows.length,
      estimateSize: () => estimatedRowHeight,
      getItemKey,
      getScrollElement,
      overscan: initialOverscan,
      rangeExtractor,
      initialOffset,
      scrollMargin,
      initialRect,
      ...(observeElementOffset ? { observeElementOffset } : {}),
      ...(observeElementRect ? { observeElementRect } : {}),
      onChange: (rowVirtualizerInstance) => {
        // @ts-expect-error -- the itemsSizeCache property does exist,
        // but it not included in the type definition because it is marked as a private property,
        // see {@link https://github.com/TanStack/virtual/blob/%40tanstack/react-virtual%403.13.23/packages/virtual-core/src/index.ts#L378}
        virtualizedRowsSizeCacheRef.current = rowVirtualizerInstance.itemSizeCache;

        onStateChange?.(
          rowVirtualizerInstance,
          hasRestoredScrollPositionRef.current,
          hasStabilizedRef.current
        );
      },
    }),
    [
      rows.length,
      getItemKey,
      getScrollElement,
      initialOverscan,
      rangeExtractor,
      initialOffset,
      scrollMargin,
      initialRect,
      observeElementOffset,
      observeElementRect,
      estimatedRowHeight,
      onStateChange,
    ]
  );

  const virtualizerImpl = useVirtualizer(virtualizerOptions);

  useEffect(() => {
    return applyDeferredOverscan(virtualizerImpl);
  }, [applyDeferredOverscan, virtualizerImpl]);

  useAnchorVirtualizerToItemIndex(virtualizerImpl, initialAnchorItemIndex ?? 0, {
    hasRestoredScrollPositionRef,
    hasStabilizedRef,
    skipCorrections: hasPersistedChildAnchorsRef.current,
  });

  useEffect(() => {
    if (!childController || childController.isRootStable) return;

    // Root is stable when scroll position has been restored, or when
    // there was no anchor to restore to (itemIndex 0 / undefined).
    const needsRestore = Boolean(initialAnchorItemIndex);
    if (!needsRestore || hasRestoredScrollPositionRef.current) {
      childController.markRootStable();
    }
  });

  useEffect(
    () => () => {
      childController?.destroy();
    },
    [childController]
  );

  // --- Stabilization orchestration ---
  // Bridges the imperative hasStabilizedRef into reactive state by polling
  // with rAF. Adds at most one frame (~16ms) of latency after the rAF
  // correction loop converges, imperceptible while content is hidden.
  const needsRestore = Boolean(initialAnchorItemIndex);
  const [rootStabilized, setRootStabilized] = useState(!needsRestore);

  useEffect(() => {
    if (rootStabilized) return;
    let rafId: number | null = null;
    const check = () => {
      if (hasStabilizedRef.current) {
        setRootStabilized(true);
      } else {
        rafId = requestAnimationFrame(check);
      }
    };
    rafId = requestAnimationFrame(check);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [rootStabilized]);

  const noopSubscribe = useCallback(() => () => {}, []);
  const allChildrenStabilized = useSyncExternalStore(
    childController?.subscribe ?? noopSubscribe,
    () => childController?.haveAllRestoringChildrenStabilized() ?? true,
    () => true
  );

  const [timedOut, setTimedOut] = useState(false);
  const isStable = (rootStabilized && allChildrenStabilized) || timedOut;

  useEffect(() => {
    if (isStable) return;
    const id = setTimeout(() => setTimedOut(true), 1000);
    return () => clearTimeout(id);
  }, [isStable]);

  // Suppress tanstack's built-in scroll adjustments until both root AND
  // children have stabilized. When the root yields corrections to a child
  // (skipCorrections), hasStabilizedRef flips immediately but children
  // haven't mounted yet — allowing adjustments at this point would cause
  // root row resizes to shift the scroll position while the child's
  // correction loop is still converging.
  virtualizerImpl.shouldAdjustScrollPositionOnItemSizeChange = (item) => {
    if (!hasStabilizedRef.current) return false;
    if (childController && !childController.haveAllRestoringChildrenStabilized()) return false;
    return item.start < (virtualizerImpl.scrollOffset ?? 0);
  };

  const returnValue = useMemo(
    () => ({
      get scrollOffset() {
        return virtualizerImpl.scrollOffset;
      },
      get range() {
        return virtualizerImpl.range;
      },
      getTotalSize: virtualizerImpl.getTotalSize.bind(virtualizerImpl),
      getVirtualItems: virtualizerImpl.getVirtualItems.bind(virtualizerImpl),
      measureElement: virtualizerImpl.measureElement.bind(virtualizerImpl),
      scrollToVirtualizedIndex: ((offset, options = {}) => {
        return virtualizerImpl.options.scrollToFn(offset, options, virtualizerImpl);
      }) satisfies CascadeVirtualizerReturnValue['scrollToVirtualizedIndex'],
      get measurementsCache() {
        return virtualizerImpl.measurementsCache;
      },
      calculateRange: virtualizerImpl.calculateRange.bind(virtualizerImpl),
      get isScrolling() {
        return virtualizerImpl.isScrolling;
      },
      get scrollElement() {
        return virtualizerImpl.scrollElement;
      },
      get scrollToLastVirtualizedRow() {
        return () => this.scrollToVirtualizedIndex(rows.length - 1);
      },
      get virtualizedRowComputedTranslateValue() {
        return virtualizedRowComputedTranslateValueRef.current;
      },
      get virtualizedRowsSizeCache() {
        return virtualizedRowsSizeCacheRef.current;
      },
      get scrollRect() {
        return virtualizerImpl.scrollRect;
      },
      childController,
      isStable,
    }),
    [virtualizerImpl, rows.length, childController, isStable]
  );

  // the assignment here is to ensure that the virtualizer instance is accessible to the child controller
  virtualizerReturnValueRef.current = returnValue;

  return returnValue;
}) as UseCascadeVirtualizer;

/**
 * @description returns the position style for the grid row, in relation to the scrolled virtualized row.
 * Z-index is calculated as (visibleRowCount - renderIndex) to ensure rows higher in the list
 * have higher z-index values. This prevents visual glitches during row expansion where
 * unmeasured rows below might briefly appear over the expanding row
 * because of their transform value has yet to update.
 *
 * Style objects are cached by translateY+zIndex to avoid allocating new objects
 * for rows whose position hasn't changed between renders.
 */
const rowStyleCache = new Map<string, CSSProperties>();

export const getGridRowPositioningStyle = (
  renderIndex: number,
  virtualizedRowComputedTranslateValueMap: Map<number, number>,
  visibleRowCount: number
): CSSProperties => {
  const translateY = virtualizedRowComputedTranslateValueMap.get(renderIndex) ?? 0;
  const zIndex = visibleRowCount - renderIndex;
  const cacheKey = `${translateY}:${zIndex}`;

  let style = rowStyleCache.get(cacheKey);
  if (!style) {
    style = { transform: `translateY(${translateY}px)`, zIndex };
    rowStyleCache.set(cacheKey, style);

    if (rowStyleCache.size > 500) {
      const firstKey = rowStyleCache.keys().next().value!;
      rowStyleCache.delete(firstKey);
    }
  }

  return style;
};

export function VirtualizedCascadeRowList<G extends GroupNode>({
  activeStickyIndex,
  getVirtualItems,
  virtualizedRowComputedTranslateValue,
  rows,
  listItemRenderer,
}: VirtualizedCascadeListProps<G>) {
  const virtualItems = getVirtualItems();

  return virtualItems.map(function buildCascadeRows(virtualItem, renderIndex) {
    const row = rows[virtualItem.index];

    const isActiveSticky = activeStickyIndex === virtualItem.index;

    // side effect to record the computed translate value for each item of virtualized row,
    // doing this allows us to position the header correctly in relation to the scrolled virtualized rows
    virtualizedRowComputedTranslateValue.set(renderIndex, virtualItem.start);

    return (
      <Fragment key={row.id}>
        {listItemRenderer({
          row,
          isActiveSticky,
          virtualItem,
          virtualRowStyle: getGridRowPositioningStyle(
            renderIndex,
            virtualizedRowComputedTranslateValue,
            virtualItems.length
          ),
        })}
      </Fragment>
    );
  });
}
