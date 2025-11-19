/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ContentListCoreConfig,
  ContentListKibanaServices,
  DataSourceConfig,
  ContentListFeatures,
  TransformFunction,
} from '@kbn/content-list-provider';
import { ContentListProvider, createUserProfileAdapter } from '@kbn/content-list-provider';
import { createFindItemsAdapter, type TableListViewFindItemsFn } from './strategy';

/**
 * Props for the Client Kibana provider.
 *
 * This provider wraps an existing `TableListView`-style `findItems` function and handles
 * client-side sorting, filtering, and pagination. Best suited for migrating from `TableListView`.
 *
 * @template T The item type from the datasource.
 */
export interface ContentListClientKibanaProviderProps<T extends UserContentCommonSchema>
  extends ContentListCoreConfig {
  /**
   * The consumer's existing `findItems` function (same signature as `TableListView`).
   *
   * Pass your existing implementation directly - no changes needed. The provider
   * will wrap it with an adapter that handles the new interface.
   *
   * @example
   * ```tsx
   * const findItems = async (searchTerm, { references, referencesToExclude } = {}) => {
   *   return dashboardClient.search({
   *     search: searchTerm,
   *     tags: {
   *       included: references?.map(({ id }) => id),
   *       excluded: referencesToExclude?.map(({ id }) => id),
   *     },
   *   }).then(({ total, dashboards }) => ({
   *     total,
   *     hits: dashboards.map(transformToDashboardUserContent),
   *   }));
   * };
   * ```
   */
  findItems: TableListViewFindItemsFn<T>;

  /**
   * Optional transform function to convert raw items to the expected format.
   * Default transform is applied for `UserContentCommonSchema`-compatible types.
   */
  transform?: TransformFunction<T>;

  /**
   * Services for the provider.
   * `core` and `savedObjectsTagging` are required. `tags` and `userProfile` are derived
   * from `savedObjectsTagging` and `core.userProfile` respectively.
   */
  services: ContentListKibanaServices;

  /**
   * Feature configuration for enabling/customizing capabilities.
   *
   * Service-dependent features (starred, tags, userProfiles) are automatically enabled
   * when their corresponding services are provided. Set a feature to `false` to explicitly
   * disable it even when the service is available.
   */
  features?: ContentListFeatures;
}

/**
 * Client-side Kibana provider for content list functionality.
 *
 * This provider wraps an existing `TableListView`-style `findItems` function, enabling
 * consumers to migrate from `TableListView` with minimal changes. It handles **client-side**
 * sorting, filtering by user, and pagination.
 *
 * The consumer's `findItems` function is called with:
 * - `searchQuery`: The text search query.
 * - `refs`: Tag references mapped from `filters.tags`.
 *
 * The provider then applies:
 * - User filtering (client-side, since `TableListView` doesn't support this).
 * - Sorting (client-side).
 * - Pagination (client-side).
 *
 * Best suited for:
 * - Migrating from `TableListView` with minimal code changes.
 * - Smaller datasets (< 10,000 items).
 * - Legacy compatibility with `TableListView` behavior.
 *
 * For larger datasets or server-side operations, use `ContentListServerKibanaProvider`
 * from `@kbn/content-list-provider-server` instead.
 *
 * @example
 * ```tsx
 * import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';
 *
 * // Your existing findItems function from TableListView - no changes needed!
 * const findItems = useCallback(
 *   async (searchTerm, { references, referencesToExclude } = {}) => {
 *     return findService.search({
 *       search: searchTerm,
 *       per_page: listingLimit,
 *       tags: {
 *         included: (references ?? []).map(({ id }) => id),
 *         excluded: (referencesToExclude ?? []).map(({ id }) => id),
 *       },
 *     }).then(({ total, dashboards }) => ({
 *       total,
 *       hits: dashboards.map(transformToDashboardUserContent),
 *     }));
 *   },
 *   [listingLimit]
 * );
 *
 * <ContentListClientKibanaProvider
 *   findItems={findItems}
 *   entityName="dashboard"
 *   entityNamePlural="dashboards"
 *   services={{
 *     core: coreStart,
 *     savedObjectsTagging: savedObjectsTaggingService?.getTaggingApi(),
 *     favorites: favoritesService,
 *   }}
 * >
 *   <MyDashboardList />
 * </ContentListClientKibanaProvider>
 * ```
 */
export const ContentListClientKibanaProvider = <T extends UserContentCommonSchema>({
  children,
  services: servicesProp,
  features = {},
  entityName,
  entityNamePlural,
  item,
  isReadOnly,
  queryKeyScope,
  findItems: consumerFindItems,
  transform,
}: PropsWithChildren<ContentListClientKibanaProviderProps<T>>): JSX.Element => {
  const {
    core: { userProfile },
    savedObjectsTagging,
    favorites,
  } = servicesProp;

  // Create a stable reference for bulkGetUserProfiles.
  const bulkGetUserProfiles = useMemo(
    () => async (uids: string[]) => {
      if (uids.length === 0) {
        return [];
      }
      return userProfile.bulkGet({ uids: new Set(uids), dataPath: 'avatar' });
    },
    [userProfile]
  );

  // Wrap consumer's findItems with the adapter for client-side processing.
  // This matches the original TableListView behavior: call consumer's findItems,
  // then filter/sort/paginate in browser.
  // The adapter also resolves usernames to UIDs for filtering using cached profiles.
  // Note: Starred filtering is handled reactively in the state provider, not here.
  const dataSource = useMemo(() => {
    const { findItems, clearCache } = createFindItemsAdapter({
      findItems: consumerFindItems,
      bulkGetUserProfiles,
    });

    return {
      findItems,
      clearCache,
      transform,
    } as DataSourceConfig<T>;
  }, [consumerFindItems, transform, bulkGetUserProfiles]);

  // Build services object for the base provider.
  // Tags and userProfile are derived from Kibana dependencies, not from services prop.
  const services = useMemo(
    () => ({
      tags: {
        getTagList: savedObjectsTagging.ui.getTagList,
      },
      favorites,
      userProfile: createUserProfileAdapter(userProfile),
    }),
    [favorites, userProfile, savedObjectsTagging]
  );

  return (
    <ContentListProvider
      {...{
        entityName,
        entityNamePlural,
        item,
        isReadOnly,
        queryKeyScope,
        dataSource,
        services,
        features,
      }}
    >
      {children}
    </ContentListProvider>
  );
};
