/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContentListState } from './use_content_list_state';

/**
 * Hook to access ContentList items and loading state
 *
 * Use this hook when you need access to the currently loaded items and their
 * loading/error state. This is the primary hook for rendering item lists.
 *
 * @throws Error if used outside ContentListProvider
 * @returns Object containing:
 *   - items: Currently loaded items (ContentListItem[])
 *   - totalItems: Total count of items available
 *   - isLoading: Whether data is being fetched
 *   - error: Error if fetch failed
 *   - refetch: Function to manually refetch items
 *
 * @example
 * ```tsx
 * function ItemsList() {
 *   const { items, isLoading, totalItems, refetch } = useContentListItems();
 *
 *   if (isLoading) return <EuiLoadingSpinner />;
 *
 *   return (
 *     <div>
 *       <button onClick={refetch}>Refresh</button>
 *       Showing {items.length} of {totalItems} items
 *       {items.map(item => <ItemRow key={item.id} item={item} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export const useContentListItems = () => {
  const { state, refetch } = useContentListState();

  return {
    items: state.items,
    totalItems: state.totalItems,
    isLoading: state.isLoading,
    error: state.error,
    refetch,
  };
};
