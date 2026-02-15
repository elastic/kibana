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
 * Hook to access the current list of items and loading state.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing items, totalItems, isLoading, isFetching, error, and refetch.
 *
 * @example
 * ```tsx
 * function MyList() {
 *   const { items, isLoading, isFetching, error, refetch } = useContentListItems();
 *
 *   if (isLoading) return <EuiLoadingSpinner />;
 *   if (error) return <EuiCallOut color="danger">{error.message}</EuiCallOut>;
 *
 *   return (
 *     <ul>
 *       {items.map((item) => (
 *         <li key={item.id}>{item.title}</li>
 *       ))}
 *     </ul>
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
    isFetching: state.isFetching,
    error: state.error,
    refetch,
  };
};
