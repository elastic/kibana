/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ContentListCoreConfig,
  ContentListFeatures,
  DataSourceConfig,
  FilterFacetConfig,
  UserProfileEntry,
  UserProfileStore,
} from '@kbn/content-list-provider';
import {
  ContentListProvider,
  isPaginationConfig,
  useContentListState,
} from '@kbn/content-list-provider';
import { SAVED_OBJECTS_PER_PAGE_ID } from '@kbn/management-settings-ids';
import { useFavorites } from '@kbn/content-management-favorites-public';
import type { Tag } from '@kbn/content-management-tags';
import type { TableListViewFindItemsFn, ContentListClientServices } from './types';
import {
  createClientStrategy,
  filterItems,
  getCreatorKey,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
} from './strategy';
import type { ItemDecorator } from './strategy';
import { ProfilePrimeEffect } from './profile_prime_effect';
import { createPrimingState, type PrimingState } from './prime_relevant_profiles';

/**
 * Compute per-key item counts from the full item set.
 *
 * @param items - The item set to count.
 * @param keyFn - Extracts zero or more keys from a single item.
 */
const computeCounts = (
  items: UserContentCommonSchema[],
  keyFn: (item: UserContentCommonSchema) => string[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const key of keyFn(item)) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
};

/** Extract tag IDs from an item's references. */
const tagKeys = (item: UserContentCommonSchema): string[] =>
  item.references?.filter((ref) => ref.type === 'tag').map((ref) => ref.id) ?? [];

/** Extract the creator key for an item, aligned with {@link getCreatorKey} in `strategy.ts`. */
const createdByKeys = (item: UserContentCommonSchema): string[] => [getCreatorKey(item)];

/**
 * Bridges React Query's `useFavorites()` data into the strategy's decorator
 * via a shared ref, then calls `refresh()` so the decorator re-runs with the
 * updated favorite IDs — without an additional HTTP call.
 *
 * This is the **single source of truth** for `getFavorites()`. The decorator
 * never calls the favorites API directly; it reads from the ref. On mount,
 * the ref starts empty (items render without `starred`). Once React Query
 * fetches, this effect seeds the ref and triggers a refresh so items pick up
 * the correct starred state.
 *
 * Renders nothing — exists only for side-effects. Rendered as a child of
 * `ContentListProvider` so both `useFavorites()` and `useContentListState()`
 * are available in the React tree.
 */
const FavoritesSyncEffect = ({
  favoriteIdsRef,
}: {
  favoriteIdsRef: React.MutableRefObject<Set<string> | undefined>;
}) => {
  const { refresh } = useContentListState();
  const { data, dataUpdatedAt } = useFavorites();
  // Initialize to 0 so the first data arrival always triggers a refresh —
  // even when React Query has warm cached data from a prior mount.
  const prevUpdatedAtRef = useRef(0);

  useEffect(() => {
    if (data) {
      favoriteIdsRef.current = new Set(data.favoriteIds);
    }
    if (dataUpdatedAt && dataUpdatedAt !== prevUpdatedAtRef.current) {
      prevUpdatedAtRef.current = dataUpdatedAt;
      refresh();
    }
  }, [data, dataUpdatedAt, favoriteIdsRef, refresh]);

  return null;
};

/**
 * Props for the Client provider.
 *
 * This provider wraps an existing `TableListView`-style `findItems` function and handles
 * client-side sorting, filtering, and pagination.
 */
export type ContentListClientProviderProps = ContentListCoreConfig & {
  children?: ReactNode;
  /** The consumer's existing `findItems` function (same signature as `TableListView`). */
  findItems: TableListViewFindItemsFn;
  /** Feature configuration for enabling/customizing capabilities. */
  features?: ContentListFeatures;
  /**
   * Services required by the client provider.
   *
   * `uiSettings` is mandatory — used to read `savedObjects:perPage` for the default page size.
   */
  services: ContentListClientServices;
  /** Called after each successful item fetch. */
  onFetchSuccess?: DataSourceConfig['onFetchSuccess'];
};

/**
 * Client-side content list provider.
 *
 * Wraps an existing `TableListView`-style `findItems` function and provides
 * client-side sorting, filtering, and pagination. The strategy handles transformation
 * of `UserContentCommonSchema` items to `ContentListItem` format and caches the
 * full item set for use by `getFacets` implementations.
 *
 * When `services.tags` is provided, it constructs a `FilterFacetConfig<Tag>`
 * for `features.tags` that computes tag facets from the cached item set.
 * When `services.userProfiles` is provided, it constructs a
 * `FilterFacetConfig<UserProfileEntry>` for `features.userProfiles` the same way.
 *
 * The `services.uiSettings` is read once at mount to determine the default page size
 * from the `savedObjects:perPage` user setting. An explicit
 * `features.pagination.initialPageSize` takes priority over the uiSettings value.
 *
 * @example
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 *   services={{ uiSettings: core.uiSettings }}
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
  onFetchSuccess,
  ...rest
}: ContentListClientProviderProps): JSX.Element => {
  const favoritesClient = services?.favorites;
  const starredEnabled = featuresProp.starred !== false && !!favoritesClient;

  // Shared ref bridging React Query's `useFavorites()` data into the
  // synchronous decorator. `FavoritesSyncEffect` writes here whenever the
  // favorites query updates; the decorator reads without an HTTP call.
  // On mount the ref is empty — items render without `starred`, then
  // `FavoritesSyncEffect` triggers a refresh once React Query delivers data.
  const favoriteIdsRef = useRef<Set<string> | undefined>(undefined);

  const decorate: ItemDecorator | undefined = useCallback(
    async (items: UserContentCommonSchema[]) => {
      const favoriteSet = favoriteIdsRef.current;
      if (!favoriteSet) {
        return items;
      }
      return items.map((item) => ({ ...item, starred: favoriteSet.has(item.id) }));
    },
    []
  );

  const { findItems, onInvalidate, onRefresh, getItems, getDatasetVersion } = useMemo(
    () => createClientStrategy(tableListViewFindItems, starredEnabled ? decorate : undefined),
    [tableListViewFindItems, starredEnabled, decorate]
  );

  const dataSource: DataSourceConfig = useMemo(
    () => ({ findItems, onInvalidate, onRefresh, onFetchSuccess }),
    [findItems, onInvalidate, onRefresh, onFetchSuccess]
  );

  const tagsService = services?.tags;
  const userProfilesService = services?.userProfiles;

  // Shared priming state — passed to both the `ProfilePrimeEffect` component
  // and `getFacets` so they share dedup / version tracking.
  const primingStateRef = useRef<PrimingState>(createPrimingState());
  const primingState = primingStateRef.current;

  // Ref bridge for the `UserProfileStore`. The store lives inside
  // `ContentListProvider`'s context tree; `ProfilePrimeEffect` (rendered as
  // a child) writes the store here so `getFacets` (defined before the tree
  // mounts) can read it.
  const storeRef = useRef<UserProfileStore | undefined>(undefined);

  // Build `FilterFacetConfig<Tag>` for tags when the tags service is available
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
    const config: FilterFacetConfig<Tag> = {
      getFacets: async ({ filters }) => {
        const narrowed = filterItems(getItems(), filters);
        const tagCounts = computeCounts(narrowed, tagKeys);
        const tags = getTagList();
        return tags.map((tag) => ({
          key: tag.id ?? tag.name,
          label: tag.name,
          count: tagCounts[tag.id ?? tag.name] ?? 0,
          data: tag,
        }));
      },
    };
    return config;
  }, [featuresProp.tags, tagsService, getItems]);

  // Build `FilterFacetConfig<UserProfileEntry>` for user profiles when the
  // service is available and the feature isn't explicitly disabled or already
  // configured.
  //
  // `getFacets` delegates profile loading to the shared priming routine so
  // that all trigger sites (`ProfilePrimeEffect`, popover, avatar) feed the same
  // `UserProfileStore`. After priming, facet labels are read from the store.
  const userProfilesFeature = useMemo((): ContentListFeatures['userProfiles'] => {
    if (featuresProp.userProfiles === false) {
      return false;
    }
    if (typeof featuresProp.userProfiles === 'object') {
      return featuresProp.userProfiles;
    }
    if (!userProfilesService) {
      return featuresProp.userProfiles;
    }

    const sentinelKeys = new Set([MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER]);
    const config: FilterFacetConfig<UserProfileEntry> = {
      getFacets: async ({ filters }) => {
        const narrowed = filterItems(getItems(), filters);
        const userCounts = computeCounts(narrowed, createdByKeys);
        const allKeys = Object.keys(userCounts);
        if (allKeys.length === 0) {
          return [];
        }

        // Resolve profiles for facet labels via a direct bulkResolve call.
        // We intentionally avoid reading from `store.resolve()` here because
        // the store's `resolve` function closes over React state that may be
        // stale after an async merge (state updates are batched and only
        // visible after the next render). Using the bulkResolve response
        // directly guarantees fresh data for facet labels.
        //
        // The resolved profiles are also merged into the shared store so
        // that query resolution (`resolveFuzzyDisplayToIds` via
        // `store.getAll()`) benefits on the next render cycle.
        const realUids = allKeys.filter((k) => !sentinelKeys.has(k));
        const profiles = realUids.length > 0 ? await userProfilesService.bulkResolve(realUids) : [];
        const profilesByUid = new Map(profiles.map((p) => [p.uid, p]));

        const store = storeRef.current;
        if (store && profiles.length > 0) {
          store.merge(profiles);
        }

        const facets = allKeys
          .filter((key) => key !== NO_CREATOR_USER_FILTER)
          .map((key) => {
            if (key === MANAGED_USER_FILTER) {
              return {
                key,
                label: i18n.translate(
                  'contentManagement.contentList.table.createdByCell.managedLabel',
                  { defaultMessage: 'Managed' }
                ),
                count: userCounts[key] ?? 0,
                data: undefined,
              };
            }
            const profile = profilesByUid.get(key);
            return {
              key,
              label: profile?.fullName ?? key,
              count: userCounts[key] ?? 0,
              data: profile,
            };
          });

        return facets;
      },
    };
    return config;
  }, [featuresProp.userProfiles, userProfilesService, getItems]);

  const features: ContentListFeatures = useMemo(
    () => ({
      ...featuresProp,
      tags: tagsFeature,
      userProfiles: userProfilesFeature,
    }),
    [featuresProp, tagsFeature, userProfilesFeature]
  );

  // Read page size from uiSettings once at mount. Not reactive — page size
  // setting changes during a session are not expected to take effect until reload.
  const [uiSettingsPageSize] = useState(() =>
    services.uiSettings.get<number>(SAVED_OBJECTS_PER_PAGE_ID)
  );

  // Merge: explicit pagination: false > explicit initialPageSize > uiSettings > base default.
  const resolvedFeatures = useMemo(() => {
    const { pagination } = features ?? {};

    // Respect explicit disablement — don't re-enable by writing a config object.
    if (pagination === false) {
      return features;
    }

    // Consumer explicitly set a page size — don't override.
    if (isPaginationConfig(pagination) && typeof pagination.initialPageSize === 'number') {
      return features;
    }

    return {
      ...features,
      pagination: {
        ...(isPaginationConfig(pagination) ? pagination : {}),
        initialPageSize: uiSettingsPageSize,
      },
    };
  }, [features, uiSettingsPageSize]);

  return (
    <ContentListProvider
      dataSource={dataSource}
      features={resolvedFeatures}
      services={services}
      {...rest}
    >
      {starredEnabled && <FavoritesSyncEffect favoriteIdsRef={favoriteIdsRef} />}
      {userProfilesService && (
        <ProfilePrimeEffect
          getItems={getItems}
          getDatasetVersion={getDatasetVersion}
          primingState={primingState}
          storeRef={storeRef}
        />
      )}
      {children}
    </ContentListProvider>
  );
};
