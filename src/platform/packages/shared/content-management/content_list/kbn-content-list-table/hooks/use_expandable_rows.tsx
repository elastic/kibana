/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { EuiLoadingSpinner, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useContentListItems, type ContentListItem } from '@kbn/content-list-provider';

/**
 * Get the row ID used by `EuiBasicTable`.
 *
 * @param itemId - The item's unique identifier.
 * @returns The row ID string used by the table.
 */
export const getRowId = (itemId: string): string => `content-list-table-item-${itemId}`;

/**
 * Type for synchronous or asynchronous render functions.
 *
 * Used by `renderDetails` prop on {@link ContentListTable}.
 */
export type RenderDetailsFunction = (
  item: ContentListItem
) => React.ReactNode | Promise<React.ReactNode>;

/**
 * Result object returned by {@link useExpandableRows}.
 */
export interface UseExpandableRowsResult {
  /** Map of expanded row IDs to their content. */
  itemIdToExpandedRowMap: Record<string, React.ReactNode> | undefined;
  /** Toggle expansion state for an item. */
  toggleRowExpanded: (item: ContentListItem) => void;
  /** Check if a row has expandable content. */
  hasExpandableContent: (item: ContentListItem) => boolean;
  /** Check if a row is currently expanded. */
  isRowExpanded: (item: ContentListItem) => boolean;
  /** Whether any rows have expandable content (used to show/hide expander column). */
  hasAnyExpandableContent: boolean;
  /** Set of item IDs that are currently loading their expanded content. */
  loadingItemIds: Set<string>;
}

/**
 * Async content state for a single expanded row.
 */
interface AsyncContentState {
  /** The rendered content (null if not yet loaded). */
  content: React.ReactNode | null;
  /** Whether content is currently loading. */
  isLoading: boolean;
  /** Error that occurred during loading. */
  error: Error | null;
}

/**
 * Component to render loading state for expanded rows.
 */
const ExpandedRowLoading = () => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="center"
    gutterSize="s"
    role="status"
    aria-label="Loading details"
  >
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="m" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        Loading...
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/**
 * Component to render error state for expanded rows.
 */
const ExpandedRowError = ({ error }: { error: Error }) => (
  <EuiText size="s" color="danger" data-test-subj="expanded-row-error">
    Failed to load details: {error.message}
  </EuiText>
);

/**
 * Options for the {@link useExpandableRows} hook.
 */
export interface UseExpandableRowsOptions {
  /**
   * Optional filtered items to use instead of provider items.
   * When provided, expansion logic uses these items.
   */
  filteredItems?: ContentListItem[];
}

/**
 * Hook to manage expandable rows for table.
 *
 * Handles both synchronous and asynchronous render functions with proper loading
 * and error states. Supports lazy evaluation for performance.
 *
 * @param renderDetails - Optional function to render expandable row content.
 *   Can be synchronous (returns `ReactNode`) or asynchronous (returns `Promise<ReactNode>`).
 *   Only called for actually expanded rows (lazy evaluation).
 * @param canExpand - Optional predicate to determine if a row can be expanded.
 *   If not provided and `renderDetails` is set, all rows are expandable by default.
 *   Use this for performance when checking expandability is cheaper than rendering.
 * @param options - Optional configuration including filtered items.
 * @returns Object with expansion state and controls (see {@link UseExpandableRowsResult}).
 */
export const useExpandableRows = (
  renderDetails?: RenderDetailsFunction,
  canExpand?: (item: ContentListItem) => boolean,
  options?: UseExpandableRowsOptions
): UseExpandableRowsResult => {
  const { items: providerItems } = useContentListItems();

  // Use filtered items if provided, otherwise fall back to provider items.
  const items = options?.filteredItems ?? providerItems;
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
  const [asyncContentMap, setAsyncContentMap] = useState<Map<string, AsyncContentState>>(new Map());

  // Track mounted state to prevent state updates after unmount.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Monotonic counter for generating unique request tokens (avoids same-millisecond issues with Date.now()).
  const requestCounterRef = useRef(0);

  // Track pending requests to detect staleness (row collapsed while loading).
  const pendingRequestsRef = useRef<Map<string, number>>(new Map());

  // Memoize items by ID to avoid O(n) lookups in effects and callbacks.
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  // Check if a specific item has expandable content using the predicate
  // If no predicate provided, all items can expand when renderDetails is set
  const hasExpandableContent = useCallback(
    (item: ContentListItem) => {
      if (!renderDetails) {
        return false;
      }
      return canExpand ? canExpand(item) : true;
    },
    [renderDetails, canExpand]
  );

  // Check if any items have expandable content
  // Uses the predicate for efficient checking without rendering
  const hasAnyExpandableContent = useMemo(() => {
    if (!renderDetails) {
      return false;
    }
    // If no canExpand predicate, assume all items can expand
    if (!canExpand) {
      return items.length > 0;
    }
    // Otherwise check if any item passes the predicate
    return items.some(canExpand);
  }, [renderDetails, canExpand, items]);

  // Check if a row is currently expanded
  const isRowExpanded = useCallback(
    (item: ContentListItem) => expandedItemIds.has(item.id),
    [expandedItemIds]
  );

  // Get loading item IDs from async content map
  const loadingItemIds = useMemo(() => {
    const loading = new Set<string>();
    asyncContentMap.forEach((state, id) => {
      if (state.isLoading) {
        loading.add(id);
      }
    });
    return loading;
  }, [asyncContentMap]);

  // Toggle expansion state
  const toggleRowExpanded = useCallback((item: ContentListItem) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  // Effect to handle async content loading when items are expanded
  useEffect(() => {
    if (!renderDetails) {
      return;
    }

    expandedItemIds.forEach((itemId) => {
      const item = itemsById.get(itemId);
      if (!item || !hasExpandableContent(item)) {
        return;
      }

      // Skip if already loaded or loading.
      const existingState = asyncContentMap.get(itemId);
      if (existingState && (existingState.content !== null || existingState.isLoading)) {
        return;
      }

      // Try to render content.
      try {
        const result = renderDetails(item);

        // Check if result is a Promise.
        if (result && typeof (result as Promise<React.ReactNode>).then === 'function') {
          // Generate a unique request token for staleness detection using monotonic counter.
          requestCounterRef.current += 1;
          const requestToken = requestCounterRef.current;
          pendingRequestsRef.current.set(itemId, requestToken);

          // Set loading state.
          setAsyncContentMap((prev) => {
            const next = new Map(prev);
            next.set(itemId, { content: null, isLoading: true, error: null });
            return next;
          });

          // Handle async result with staleness and mount checks.
          (result as Promise<React.ReactNode>)
            .then((content) => {
              // Check if component is still mounted and request is still current.
              if (!isMountedRef.current) {
                return;
              }
              if (pendingRequestsRef.current.get(itemId) !== requestToken) {
                return; // Request is stale (row was collapsed/re-expanded).
              }
              pendingRequestsRef.current.delete(itemId);
              setAsyncContentMap((prev) => {
                const next = new Map(prev);
                next.set(itemId, { content, isLoading: false, error: null });
                return next;
              });
            })
            .catch((error: Error) => {
              // Check if component is still mounted and request is still current.
              if (!isMountedRef.current) {
                return;
              }
              if (pendingRequestsRef.current.get(itemId) !== requestToken) {
                return; // Request is stale.
              }
              pendingRequestsRef.current.delete(itemId);
              setAsyncContentMap((prev) => {
                const next = new Map(prev);
                next.set(itemId, { content: null, isLoading: false, error });
                return next;
              });
            });
        } else {
          // Synchronous result - store directly.
          setAsyncContentMap((prev) => {
            const next = new Map(prev);
            next.set(itemId, { content: result as React.ReactNode, isLoading: false, error: null });
            return next;
          });
        }
      } catch (error) {
        // Handle synchronous errors.
        setAsyncContentMap((prev) => {
          const next = new Map(prev);
          next.set(itemId, {
            content: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return next;
        });
      }
    });
  }, [renderDetails, expandedItemIds, itemsById, hasExpandableContent, asyncContentMap]);

  // Clean up async content map and pending requests when items are collapsed.
  useEffect(() => {
    // Clean up pending requests for collapsed items.
    // Create array of keys to delete to avoid modifying Map while iterating.
    const keysToDelete: string[] = [];
    pendingRequestsRef.current.forEach((_, itemId) => {
      if (!expandedItemIds.has(itemId)) {
        keysToDelete.push(itemId);
      }
    });
    keysToDelete.forEach((key) => pendingRequestsRef.current.delete(key));

    setAsyncContentMap((prev) => {
      const next = new Map(prev);
      let changed = false;
      prev.forEach((_, itemId) => {
        if (!expandedItemIds.has(itemId)) {
          next.delete(itemId);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [expandedItemIds]);

  // Build the expanded row map for EuiBasicTable
  const itemIdToExpandedRowMap = useMemo(() => {
    if (!renderDetails || expandedItemIds.size === 0) {
      return undefined;
    }

    const map: Record<string, React.ReactNode> = {};
    expandedItemIds.forEach((itemId) => {
      const item = itemsById.get(itemId);
      if (!item || !hasExpandableContent(item)) {
        return;
      }

      const rowId = getRowId(itemId);
      const asyncState = asyncContentMap.get(itemId);

      if (asyncState?.isLoading) {
        // Show loading state
        map[rowId] = <ExpandedRowLoading />;
      } else if (asyncState?.error) {
        // Show error state
        map[rowId] = <ExpandedRowError error={asyncState.error} />;
      } else if (asyncState?.content) {
        // Show loaded content
        map[rowId] = asyncState.content;
      }
      // If no async state yet, the effect will trigger loading
    });

    return Object.keys(map).length > 0 ? map : undefined;
  }, [renderDetails, expandedItemIds, itemsById, hasExpandableContent, asyncContentMap]);

  return {
    itemIdToExpandedRowMap,
    toggleRowExpanded,
    hasExpandableContent,
    isRowExpanded,
    hasAnyExpandableContent,
    loadingItemIds,
  };
};
