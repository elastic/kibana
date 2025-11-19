/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext, useMemo } from 'react';
import { ContentListStateContext } from './state_provider';
import { useContentListConfig } from '../context';
import type { ContentListStateContextValue } from './types';

/**
 * Combined context type that includes both state context and configuration.
 * This provides proper typing for the `useContentListState` hook.
 */
export type ContentListContextValue = ContentListStateContextValue &
  ReturnType<typeof useContentListConfig>;

/**
 * Internal hook to access the state context.
 */
const useContentListStateContext = (): ContentListStateContextValue => {
  const context = useContext(ContentListStateContext);

  if (!context) {
    throw new Error('ContentList hooks must be used within ContentListProvider');
  }

  return context;
};

/**
 * Internal hook to access the full ContentList context (configuration + state + actions).
 *
 * This hook is used internally by feature-based hooks to access both configuration
 * and state context. For external use, prefer the feature-based hooks for better
 * clarity and tree-shaking.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Combined context with:
 *   - `state`: Runtime state.
 *   - `dispatch`: Function to dispatch state actions.
 *   - `refetch`: Function to manually refetch items.
 *   - `...config`: All configuration values (from `useContentListConfig`) including:
 *     - `filtering`: `FilteringConfig` for custom filter definitions.
 *     - `sorting`: `SortingConfig` for sort options.
 *     - `pagination`: `PaginationConfig` for page size options.
 *     - `search`: `SearchConfig` for search options.
 *
 * @example
 * ```tsx
 * // Internal usage in feature hooks
 * function useContentListItems() {
 *   const { state, refetch } = useContentListState();
 *   return { items: state.items, isLoading: state.isLoading, refetch };
 * }
 * ```
 */
export const useContentListState = (): ContentListContextValue => {
  const stateContext = useContentListStateContext();
  const config = useContentListConfig();

  // Memoize combined context to prevent unnecessary re-renders.
  return useMemo(
    () => ({
      ...stateContext,
      ...config,
    }),
    [stateContext, config]
  );
};
