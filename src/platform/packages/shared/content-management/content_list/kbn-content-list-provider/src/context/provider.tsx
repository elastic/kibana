/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, createContext, useContext, type ReactNode } from 'react';
import type { ContentListCoreConfig, ContentListConfig, ContentListServices } from './types';
import type { ContentListFeatures, ContentListSupports } from '../features';
import type { DataSourceConfig } from '../datasource';
import { ContentListStateProvider } from '../state';
import { QueryClientProvider, contentListQueryClient } from '../query';

/**
 * Internal context value type.
 */
export type ContentListProviderContextValue = Omit<
  ContentListCoreConfig,
  'id' | 'queryKeyScope'
> & {
  /** Optional identifier (may be undefined if only `queryKeyScope` was provided). */
  id?: string;
  /** Resolved query key scope (always present after provider initialization). */
  queryKeyScope: string;
  /** Data source configuration. */
  dataSource: DataSourceConfig;
  /** Feature configuration. */
  features: ContentListFeatures;
  /** Resolved feature support flags. */
  supports: ContentListSupports;
};

/**
 * Context for the content list configuration.
 *
 * @internal Use `useContentListConfig` hook to access this context.
 */
export const ContentListContext = createContext<ContentListProviderContextValue | null>(null);

/**
 * Props for the `ContentListProvider` component.
 */
export type ContentListProviderProps = ContentListConfig & {
  /** Child components that will have access to the content list context. */
  children: ReactNode;
  /** Optional services for the provider. */
  services?: ContentListServices;
  /** Feature configuration for enabling/customizing capabilities. */
  features?: ContentListFeatures;
};

/**
 * Main provider component for content list functionality, including data fetching
 * (via React Query), sorting, and search.
 *
 * Props like `dataSource` and `features` should be stable references to avoid
 * unnecessary re-renders. Configuration from `features.sorting` and `features.search`
 * is read once at mount; use a `key` prop to remount if you need to change initial
 * state dynamically.
 */
export const ContentListProvider = ({
  children,
  dataSource,
  labels,
  item,
  isReadOnly,
  id,
  queryKeyScope: queryKeyScopeProp,
  features = {},
}: ContentListProviderProps): JSX.Element => {
  // Derive queryKeyScope: explicit prop takes priority, otherwise derive from id.
  // At least one of id or queryKeyScope is guaranteed by ContentListIdentity type.
  const queryKeyScope = queryKeyScopeProp ?? `${id}-listing`;

  // Resolve feature support flags.
  const supports: ContentListSupports = useMemo(
    () => ({
      sorting: features.sorting !== false,
      pagination: features.pagination !== false,
      search: features.search !== false,
    }),
    [features.sorting, features.pagination, features.search]
  );

  // Create context value.
  const value: ContentListProviderContextValue = useMemo(
    () => ({
      labels,
      item,
      isReadOnly,
      id,
      queryKeyScope,
      dataSource,
      features,
      supports,
    }),
    [labels, item, isReadOnly, id, queryKeyScope, dataSource, features, supports]
  );

  return (
    <QueryClientProvider client={contentListQueryClient}>
      <ContentListContext.Provider value={value}>
        <ContentListStateProvider>{children}</ContentListStateProvider>
      </ContentListContext.Provider>
    </QueryClientProvider>
  );
};

/**
 * Hook to access the content list configuration context.
 *
 * This is a low-level hook that provides access to configuration and support flags.
 * For most use cases, prefer the feature-specific hooks like `useContentListItems`,
 * `useContentListSort`, etc.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns The content list context including configuration and support flags.
 */
export const useContentListConfig = (): ContentListProviderContextValue => {
  const context = useContext(ContentListContext);
  if (!context) {
    throw new Error(
      'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
    );
  }
  return context;
};
