/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useId, useMemo } from 'react';
import { type PropsWithChildren, createContext, useContext } from 'react';
import { ContentManagementTagsProvider } from '@kbn/content-management-tags';
import {
  UserProfilesProvider,
  type UserProfilesServices,
} from '@kbn/content-management-user-profiles';
import { FavoritesContextProvider } from '@kbn/content-management-favorites-public';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ContentListServices, ContentListConfig, ContentListCoreConfig } from './types';
import type { ContentListFeatures, Supports } from '../features';
import type { DataSourceConfig } from '../datasource';
import { ContentListStateProvider } from '../state';
import { QueryClientProvider, contentListQueryClient, extractTags } from '../query';
import { createContextValue } from './create_context_value';
import { warnOnQueryKeyScopeCollision } from './scope_collision_guard';

/**
 * Internal context value type.
 *
 * Uses `UserContentCommonSchema` as the base type for `dataSource` since the generic `T`
 * is only needed for type-checking at the props level. Once items are fetched, they get
 * transformed to `ContentListItem`, so the internal state doesn't need to know about `T`.
 */
export interface ContentListProviderContextValue extends ContentListCoreConfig {
  dataSource: DataSourceConfig<UserContentCommonSchema>;
  features: ContentListFeatures;
  /** Resolved service availability flags. */
  supports: Supports;
  queryKeyScope?: string;
  /** User profile services when available. */
  userProfileServices?: UserProfilesServices;
}

export const ContentListContext = createContext<ContentListProviderContextValue | null>(null);

/**
 * Props for the `ContentListProvider` component.
 *
 * @template T The raw item type from the datasource (defaults to `UserContentCommonSchema`).
 */
export interface ContentListProviderProps<T = UserContentCommonSchema>
  extends ContentListConfig<T> {
  /** Optional services for the provider (tags, favorites, user profiles). */
  services?: ContentListServices;
  /** Feature configuration for enabling/customizing capabilities. */
  features?: ContentListFeatures;
}

/**
 * Main provider component for content list functionality.
 *
 * This provider sets up the context for managing content lists, including:
 * - Data fetching and caching via React Query
 * - Search and filtering
 * - Sorting and pagination
 * - Item selection
 * - Optional integrations (tags, favorites, user profiles)
 *
 * Service-dependent features (starred, tags, userProfiles) are automatically enabled
 * when the corresponding service is provided. Set a feature to `false` in the `features`
 * prop to explicitly disable it even when the service is available.
 *
 * @example
 * ```tsx
 * // Custom findItems function that fetches from your API.
 * const findItems: FindItemsFn = async ({ searchQuery, filters, sort, page, signal }) => {
 *   const response = await myApi.search({
 *     query: searchQuery,
 *     tags: filters.tags,
 *     starredOnly: filters.starredOnly,
 *     sortField: sort.field,
 *     sortOrder: sort.direction,
 *     page: page.index,
 *     pageSize: page.size,
 *     signal,
 *   });
 *
 *   return {
 *     items: response.items,
 *     total: response.total,
 *   };
 * };
 *
 * <ContentListProvider
 *   entityName="dashboard"
 *   entityNamePlural="dashboards"
 *   dataSource={{ findItems }}
 *   services={{ tags: tagsService, favorites: favoritesService }}
 * >
 *   <MyContentList />
 * </ContentListProvider>
 * ```
 *
 * For Kibana saved objects, use `ContentListKibanaProvider` instead, which
 * provides built-in strategies for fetching saved objects.
 */
export const ContentListProvider = <T extends UserContentCommonSchema = UserContentCommonSchema>({
  children,
  dataSource,
  entityName,
  entityNamePlural,
  item,
  isReadOnly,
  queryKeyScope: queryKeyScopeProp,
  services = {},
  features = {},
}: PropsWithChildren<ContentListProviderProps<T>>): JSX.Element => {
  // Generate a stable unique ID for this provider instance.
  // Used as the default queryKeyScope to prevent cache collisions.
  const generatedId = useId();
  const queryKeyScope = queryKeyScopeProp ?? generatedId;

  const {
    favorites: favoritesService,
    tags: tagsService,
    userProfile: userProfileService,
  } = services;

  // Service-dependent features: enabled by default when service exists, unless explicitly disabled.
  // If feature is `false`, it's disabled regardless of service.
  // If feature is `true` or undefined (and service exists), it's enabled.
  const supportsStarred = features.starred !== false && !!favoritesService;
  const supportsTags = features.tags !== false && !!tagsService;
  const supportsUserProfiles = features.userProfiles !== false && !!userProfileService;

  const supportsContentEditor = features.contentEditor !== false && !!features.contentEditor;
  const contentEditorConfig =
    typeof features.contentEditor === 'object' && features.contentEditor !== null
      ? features.contentEditor
      : undefined;
  const supportsContentInsights =
    supportsContentEditor && !!contentEditorConfig?.contentInsightsClient;

  // Warn in development if multiple providers share the same explicit queryKeyScope.
  // Only warn when the prop was explicitly provided (not auto-generated).
  useEffect(
    () => warnOnQueryKeyScopeCollision(entityName, queryKeyScopeProp),
    [entityName, queryKeyScopeProp]
  );

  const parseSearchQuery = useMemo(() => {
    if (!supportsTags) {
      return undefined;
    }

    // Create a curried function that matches the ParsedQuery signature.
    return (queryText: string) => {
      const tagList = tagsService!.getTagList();
      const { tagIds, tagIdsToExclude, cleanText } = extractTags(queryText, tagList);
      return {
        searchQuery: cleanText,
        tagIds,
        tagIdsToExclude,
      };
    };
  }, [supportsTags, tagsService]);

  // Create context value using shared helper.
  // Cast dataSource to base type for internal context storage.
  // The generic T is only used for type-checking props; internally we work with the base schema.
  const value: ContentListProviderContextValue = createContextValue(
    { entityName, entityNamePlural, item, isReadOnly },
    dataSource as DataSourceConfig<UserContentCommonSchema>,
    features,
    {
      starred: supportsStarred,
      tags: supportsTags,
      userProfiles: supportsUserProfiles,
      contentEditor: supportsContentEditor,
      contentInsights: supportsContentInsights,
    },
    queryKeyScope,
    supportsUserProfiles ? userProfileService : undefined
  );

  // Build provider wrappers conditionally to avoid non-null assertions.
  let content: React.ReactNode = (
    <ContentListContext.Provider value={value}>
      <ContentListStateProvider>{children}</ContentListStateProvider>
    </ContentListContext.Provider>
  );

  // Wrap with optional providers based on service availability.
  if (supportsUserProfiles) {
    content = <UserProfilesProvider {...userProfileService!}>{content}</UserProfilesProvider>;
  }

  if (supportsTags) {
    content = (
      <ContentManagementTagsProvider
        getTagList={tagsService!.getTagList}
        parseSearchQuery={parseSearchQuery}
      >
        {content}
      </ContentManagementTagsProvider>
    );
  }

  if (supportsStarred) {
    content = <FavoritesContextProvider {...favoritesService!}>{content}</FavoritesContextProvider>;
  }

  return <QueryClientProvider client={contentListQueryClient}>{content}</QueryClientProvider>;
};

/**
 * Hook to access the content list services and configuration context.
 *
 * This is a low-level hook that provides access to all configuration and
 * support flags. For most use cases, prefer the feature-specific hooks
 * like `useContentListItems`, `useContentListSearch`, etc.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns The content list context including configuration and support flags.
 */
export const useContentListConfig = () => {
  const context = useContext(ContentListContext);
  if (!context) {
    throw new Error(
      'ContentListContext is missing. Ensure your component or React root is wrapped with ContentListProvider.'
    );
  }
  return context;
};
