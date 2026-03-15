/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactNode } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import type {
  ContentListCoreConfig,
  ContentListFeatures,
  ContentListServices,
  DataSourceConfig,
  FilterFeatureConfig,
  FilterFacet,
} from '@kbn/content-list-provider';
import {
  ContentListProvider,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
} from '@kbn/content-list-provider';
import type { ActiveFilters } from '@kbn/content-list-provider';
import type { TableListViewFindItemsFn } from './types';
import { createClientStrategy, filterItems } from './strategy';

/**
 * Compute per-creator item counts from the full item set.
 * Returns a map of UID (or sentinel) to count.
 */
const computeCreatorCounts = (items: UserContentCommonSchema[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.managed) {
      counts[MANAGED_USER_FILTER] = (counts[MANAGED_USER_FILTER] ?? 0) + 1;
    } else if (item.createdBy) {
      counts[item.createdBy] = (counts[item.createdBy] ?? 0) + 1;
    } else {
      counts[NO_CREATOR_USER_FILTER] = (counts[NO_CREATOR_USER_FILTER] ?? 0) + 1;
    }
  }
  return counts;
};

/**
 * Compute per-tag item counts from the full item set.
 * Tags are stored as references with `type: 'tag'`.
 */
const computeTagCounts = (items: UserContentCommonSchema[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.references) {
      for (const ref of item.references) {
        if (ref.type === 'tag') {
          counts[ref.id] = (counts[ref.id] ?? 0) + 1;
        }
      }
    }
  }
  return counts;
};

const isSentinel = (key: string): boolean =>
  key === MANAGED_USER_FILTER || key === NO_CREATOR_USER_FILTER;

/**
 * Apply the metadata filters to the full item set so facet counts reflect
 * the result set narrowed by other active filter dimensions.
 */
const applyMetadataFilters = async (
  items: UserContentCommonSchema[],
  filters: ActiveFilters,
  favorites?: FavoritesClientPublic
): Promise<UserContentCommonSchema[]> => {
  let favoriteIds: Set<string> | undefined;
  if (filters.starredOnly && favorites) {
    const { favoriteIds: ids } = await favorites.getFavorites();
    favoriteIds = new Set(ids);
  }
  return filterItems(items, filters, favoriteIds);
};

/**
 * Props for the Client provider.
 *
 * This provider wraps an existing `TableListView`-style `findItems` function and handles
 * client-side sorting, filtering, and pagination.
 */
export type ContentListClientProviderProps = ContentListCoreConfig & {
  children?: ReactNode;
  /**
   * The consumer's existing `findItems` function (same signature as `TableListView`).
   */
  findItems: TableListViewFindItemsFn;
  /**
   * Feature configuration for enabling/customizing capabilities.
   */
  features?: ContentListFeatures;
  /**
   * Optional services for the provider.
   */
  services?: ContentListServices;
};

/**
 * Client-side content list provider.
 *
 * Wraps an existing `TableListView`-style `findItems` function and provides
 * client-side sorting, filtering, and pagination. The strategy handles transformation
 * of `UserContentCommonSchema` items to `ContentListItem` format and caches the
 * full item set for use by `getMetadata` implementations.
 *
 * When `services.userProfile` is provided, this provider automatically constructs
 * a `FilterFeatureConfig` for `features.createdBy` that scans the cached item set
 * and resolves profiles via the cross-seeding `bulkGetUserProfiles`. Similarly,
 * when `services.tags` is provided, it constructs one for `features.tags`.
 *
 * @example
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 *   services={{ userProfile: myUserProfileService, tags: myTagsService }}
 * >
 *   <MyContentList />
 * </ContentListClientProvider>
 * ```
 */
export const ContentListClientProvider = ({
  children,
  findItems: tableListViewFindItems,
  features: featuresProp = {},
  services,
  ...rest
}: ContentListClientProviderProps): JSX.Element => {
  const favoritesClient = services?.favorites;

  const { findItems, getItems } = useMemo(
    () => createClientStrategy({ findItems: tableListViewFindItems, favoritesClient }),
    [tableListViewFindItems, favoritesClient]
  );

  const dataSource: DataSourceConfig = useMemo(() => ({ findItems }), [findItems]);

  const { userProfile: userProfileService, tags: tagsService } = services ?? {};

  // Build `FilterFeatureConfig` for createdBy when the user profile service is available
  // and the feature isn't explicitly disabled or already configured.
  const createdByFeature = useMemo((): ContentListFeatures['createdBy'] => {
    if (featuresProp.createdBy === false) {
      return false;
    }
    if (typeof featuresProp.createdBy === 'object') {
      return featuresProp.createdBy;
    }
    if (!userProfileService) {
      return featuresProp.createdBy;
    }

    const { bulkGetUserProfiles } = userProfileService;
    const config: FilterFeatureConfig = {
      getMetadata: async ({ filters: metadataFilters }) => {
        const allItems = getItems();
        const filteredItems = await applyMetadataFilters(
          allItems,
          metadataFilters,
          favoritesClient
        );
        const counts = computeCreatorCounts(filteredItems);
        const uids = Object.keys(counts).filter((k) => !isSentinel(k));
        const profiles = uids.length > 0 ? await bulkGetUserProfiles(uids) : [];

        const facets: FilterFacet[] = [];

        if (counts[MANAGED_USER_FILTER]) {
          facets.push({
            key: MANAGED_USER_FILTER,
            label: MANAGED_USER_FILTER,
            count: counts[MANAGED_USER_FILTER],
            data: { kind: 'managed' },
          });
        }

        for (const profile of profiles) {
          facets.push({
            key: profile.uid,
            label: profile.user.full_name ?? profile.user.username,
            count: counts[profile.uid],
            data: { kind: 'user', user: profile.user, avatar: profile.data?.avatar },
          });
        }

        if (counts[NO_CREATOR_USER_FILTER]) {
          facets.push({
            key: NO_CREATOR_USER_FILTER,
            label: NO_CREATOR_USER_FILTER,
            count: counts[NO_CREATOR_USER_FILTER],
            data: { kind: 'no_creator' },
          });
        }

        return facets;
      },
    };
    return config;
  }, [featuresProp.createdBy, userProfileService, getItems, favoritesClient]);

  // Build `FilterFeatureConfig` for tags when the tags service is available
  // and the feature isn't explicitly disabled or already configured.
  const tagsFeature = useMemo((): ContentListFeatures['tags'] => {
    if (featuresProp.tags === false) {
      return false;
    }
    if (typeof featuresProp.tags === 'object') {
      return featuresProp.tags;
    }
    if (!tagsService?.getTagList) {
      return featuresProp.tags;
    }

    const { getTagList } = tagsService;
    const config: FilterFeatureConfig = {
      getMetadata: async ({ filters: metadataFilters }) => {
        const allItems = getItems();
        const filteredItems = await applyMetadataFilters(
          allItems,
          metadataFilters,
          favoritesClient
        );
        const tagCounts = computeTagCounts(filteredItems);
        const tags = getTagList();
        return tags.map((tag) => ({
          key: tag.id ?? tag.name,
          label: tag.name,
          count: tagCounts[tag.id ?? tag.name] ?? 0,
          data: { color: tag.color, description: tag.description },
        }));
      },
    };
    return config;
  }, [featuresProp.tags, tagsService, getItems, favoritesClient]);

  const features: ContentListFeatures = useMemo(
    () => ({
      ...featuresProp,
      createdBy: createdByFeature,
      tags: tagsFeature,
    }),
    [featuresProp, createdByFeature, tagsFeature]
  );

  return (
    <ContentListProvider dataSource={dataSource} features={features} services={services} {...rest}>
      {children}
    </ContentListProvider>
  );
};
