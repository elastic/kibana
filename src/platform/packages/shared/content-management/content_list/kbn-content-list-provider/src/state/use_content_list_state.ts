/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { ContentListStateContextValue } from './types';

/**
 * Context for the content list state.
 *
 * @internal Use `useContentListState` hook to access this context.
 */
export const ContentListStateContext = createContext<ContentListStateContextValue | null>(null);

/**
 * Hook to access the content list state and dispatch function.
 *
 * This is a low-level hook. For most use cases, prefer the feature-specific hooks
 * like `useContentListSort`, `useContentListItems`, etc.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns The state context value including state, dispatch, and refetch.
 */
export const useContentListState = (): ContentListStateContextValue => {
  const context = useContext(ContentListStateContext);
  if (!context) {
    throw new Error(
      'ContentListStateContext is missing. Ensure your component is wrapped with ContentListProvider.'
    );
  }
  return context;
};
