/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, createContext, useContext, type ReactNode } from 'react';
import { ContentManagementTagsProvider } from '@kbn/content-management-tags';
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
  /** Services provided to the provider. */
  services?: ContentListServices;
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
 * (via React Query), sorting, search, and tags filtering.
 *
 * Props like `dataSource`, `features`, and `services` should be stable references to avoid
 * unnecessary re-renders. Configuration from `features.sorting`, `features.pagination`, and
 * `features.search` is read once at mount; use a `key` prop to remount if you need to change
 * initial state dynamically.
 *
 * When `services.tags` is provided (and `features.tags` is not `false`), the provider
 * automatically wraps children with the tags service context, enabling tag display
 * and filtering in child components. The tags service's `parseSearchQuery` (if present)
 * is passed through to support extracting tag filters from the search bar query text.
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
  services,
}: ContentListProviderProps): JSX.Element => {
  // Derive queryKeyScope: explicit prop takes priority, otherwise derive from id.
  // At least one of id or queryKeyScope is guaranteed by ContentListIdentity type.
  const queryKeyScope = queryKeyScopeProp ?? `${id}-listing`;

  const { tags: tagsService } = services ?? {};

  // Service-dependent features: enabled by default when service exists, unless explicitly disabled.
  const supportsTags = features.tags !== false && !!tagsService;

  // Resolve feature support flags.
  // Selection is disabled when explicitly set to `false` or when the list is read-only.
  const supports: ContentListSupports = useMemo(
    () => ({
      sorting: features.sorting !== false,
      pagination: features.pagination !== false,
      search: features.search !== false,
      selection: features.selection !== false && !isReadOnly,
      tags: supportsTags,
    }),
    [
      features.sorting,
      features.pagination,
      features.search,
      features.selection,
      isReadOnly,
      supportsTags,
    ]
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
      services,
    }),
    [labels, item, isReadOnly, id, queryKeyScope, dataSource, features, supports, services]
  );

  // Build provider tree conditionally based on service availability.
  let content: React.ReactNode = (
    <ContentListContext.Provider value={value}>
      <ContentListStateProvider>{children}</ContentListStateProvider>
    </ContentListContext.Provider>
  );

  // Wrap with tags provider when tags service is available.
  if (supportsTags && tagsService) {
    content = (
      <ContentManagementTagsProvider
        getTagList={tagsService.getTagList}
        parseSearchQuery={tagsService.parseSearchQuery}
      >
        {content}
      </ContentManagementTagsProvider>
    );
  }

  return <QueryClientProvider client={contentListQueryClient}>{content}</QueryClientProvider>;
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
