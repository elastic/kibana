/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ContentEditorFeatureConfig,
  ContentListCoreConfig,
  ContentListFeatures,
  DataSourceConfig,
  FilterFacetConfig,
  UserProfileEntry,
} from '@kbn/content-list-provider';
import {
  ContentListProvider,
  isPaginationConfig,
  useContentListState,
  ProfileCache,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  MANAGED_USER_LABEL,
  NO_CREATOR_USER_LABEL,
  SENTINEL_KEYS,
  TAG_FILTER_ID,
  CREATED_BY_FILTER_ID,
} from '@kbn/content-list-provider';
import {
  SAVED_OBJECTS_PER_PAGE_ID,
  SAVED_OBJECTS_LISTING_LIMIT_ID,
} from '@kbn/management-settings-ids';
import { useFavorites } from '@kbn/content-management-favorites-public';
import type { Tag } from '@kbn/content-management-tags';
import {
  ContentEditorKibanaProvider,
  useOpenContentEditor,
} from '@kbn/content-management-content-editor';
import type {
  TableListViewFindItemsFn,
  ContentListClientServices,
  ContentListClientFeatures,
  ContentListKibanaCore,
} from './types';
import { createClientStrategy, filterItems, getCreatorKey } from './strategy';
import type { ItemDecorator } from './strategy';
import { ProfilePrimeEffect } from './profile_prime_effect';
import type { ContentEditorConfig } from './content_editor';
import { useContentEditorOpen } from './content_editor';
import { ClientStrategyContext } from './client_strategy_context';
import type { ClientStrategyContextValue } from './client_strategy_context';
import { defineContentListFilter, type ContentListFilterMap } from './filters';
import type { ResolvedContentListFilter } from './filters';
import type { ContentListSortFieldMap } from './sorting';
import { resolveSortFieldMap, toSortField } from './sorting';

/**
 * Compute per-value item counts from the full item set.
 */
const computeFilterCounts = (
  items: UserContentCommonSchema[],
  filter: ResolvedContentListFilter
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const key of filter.normalizeValues(item)) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
};

/** Extract tag IDs from an item's references. */
const tagKeys = (item: UserContentCommonSchema): string[] =>
  item.references?.filter((ref) => ref.type === 'tag').map((ref) => ref.id) ?? [];

const EMPTY_SORT_FIELDS: ContentListSortFieldMap = {};
const BUILT_IN_FILTER_IDS = new Set<string>([TAG_FILTER_ID, CREATED_BY_FILTER_ID]);

const resolveFilterDimensions = (
  filters: ContentListClientFeatures['filters'],
  defaults: ContentListFilterMap
): ContentListFilterMap => {
  const merged = !filters
    ? defaults
    : typeof filters === 'function'
    ? filters(defaults)
    : { ...defaults, ...filters };

  return Object.fromEntries(Object.values(merged).map((filter) => [filter.fieldName, filter]));
};

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
  /**
   * A relevant subset of the Kibana `CoreStart` contract.
   */
  core: ContentListKibanaCore;
  /**
   * Feature configuration. Extends the base {@link ContentListFeatures} with Kibana-specific capabilities.
   */
  features?: ContentListClientFeatures;
  /**
   * Optional domain services. All fields are feature-scoped and independent..
   */
  services?: ContentListClientServices;
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
 * `core.uiSettings` is read once at mount to determine the default page size
 * from the `savedObjects:perPage` user setting. An explicit
 * `features.pagination.initialPageSize` takes priority over the uiSettings value.
 *
 * `core` and `services.savedObjectsTagging` feed an internal
 * `ContentEditorKibanaProvider`. Supplying `features.contentEditor` populates
 * the base provider's `features.contentEditor.open`; `<Action.ContentEditor />`
 * self-skips when it isn't wired, so consumers render it unconditionally.
 *
 * @example
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 *   core={coreStart}
 * >
 *   <MyContentList />
 * </ContentListClientProvider>
 * ```
 *
 * @example With content editor
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 *   core={coreStart}
 *   services={{ savedObjectsTagging }}
 *   features={{ contentEditor: { onSave: handleSave } }}
 * >
 *   <MyContentList />
 * </ContentListClientProvider>
 * ```
 */
export const ContentListClientProvider = (props: ContentListClientProviderProps): JSX.Element => {
  const { core, services } = props;
  // Wrap up here so the inner component can call `useOpenContentEditor()`.
  return (
    <ContentEditorKibanaProvider core={core} savedObjectsTagging={services?.savedObjectsTagging}>
      <ContentListClientProviderInner {...props} />
    </ContentEditorKibanaProvider>
  );
};

/**
 * Inner body of {@link ContentListClientProvider}, split out so
 * `useOpenContentEditor()` resolves against the outer
 * `ContentEditorKibanaProvider`.
 */
const ContentListClientProviderInner = ({
  children,
  findItems: tableListViewFindItems,
  features: featuresProp = {},
  core,
  services,
  onFetchSuccess,
  item: itemConfigProp,
  ...rest
}: ContentListClientProviderProps): JSX.Element => {
  // Client-flavored config; transformed into `features.contentEditor.open` below.
  const contentEditor = featuresProp.contentEditor;
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

  // Read listing limit once at mount. Not reactive — changes during a session
  // are not expected to take effect until reload (same pattern as page size).
  const [listingLimit] = useState(() =>
    core.uiSettings.get<number>(SAVED_OBJECTS_LISTING_LIMIT_ID)
  );

  const tagsService = services?.tags;
  const userProfilesService = services?.userProfiles;

  // Create the profile cache once and keep a stable reference.
  const profileCacheRef = useRef<ProfileCache | undefined>(undefined);
  if (userProfilesService && !profileCacheRef.current) {
    profileCacheRef.current = new ProfileCache(userProfilesService.bulkResolve);
  }
  const profileCache = profileCacheRef.current;

  const builtInFilters = useMemo((): ContentListFilterMap => {
    const filters: ContentListFilterMap = {};

    if (featuresProp.tags !== false && tagsService?.getTagList) {
      filters[TAG_FILTER_ID] = defineContentListFilter({
        id: TAG_FILTER_ID,
        title: 'Tags',
        getItemValue: tagKeys,
      });
    }

    if (featuresProp.userProfiles !== false && userProfilesService && profileCache) {
      filters[CREATED_BY_FILTER_ID] = defineContentListFilter({
        id: CREATED_BY_FILTER_ID,
        title: 'Created by',
        getItemValue: getCreatorKey,
      });
    }

    return filters;
  }, [
    featuresProp.tags,
    featuresProp.userProfiles,
    tagsService,
    userProfilesService,
    profileCache,
  ]);

  const filterDimensions = useMemo(
    () => resolveFilterDimensions(featuresProp.filters, builtInFilters),
    [builtInFilters, featuresProp.filters]
  );

  const customFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filterDimensions).filter(([id]) => !BUILT_IN_FILTER_IDS.has(id))
      ),
    [filterDimensions]
  );

  const sortingConfig = featuresProp.sorting;
  const { sortingFeature, customSortFields } = useMemo<{
    sortingFeature: ContentListFeatures['sorting'];
    customSortFields: ContentListSortFieldMap;
  }>(() => {
    const sorting = sortingConfig;
    if (sorting === false || typeof sorting !== 'object') {
      return { sortingFeature: sorting, customSortFields: EMPTY_SORT_FIELDS };
    }
    const { fields: sortFields, ...baseSorting } = sorting;
    if (!sortFields) {
      return { sortingFeature: baseSorting, customSortFields: EMPTY_SORT_FIELDS };
    }
    const resolvedFields = resolveSortFieldMap(sortFields);
    return {
      customSortFields: resolvedFields,
      sortingFeature: {
        ...baseSorting,
        fields: Object.values(resolvedFields).map(toSortField),
      },
    };
  }, [sortingConfig]);

  const filterDimensionsRef = useRef(filterDimensions);
  useEffect(() => {
    filterDimensionsRef.current = filterDimensions;
  }, [filterDimensions]);

  const customSortFieldsRef = useRef(customSortFields);
  useEffect(() => {
    customSortFieldsRef.current = customSortFields;
  }, [customSortFields]);

  const { findItems, onInvalidate, onRefresh, getItems, subscribe } = useMemo(
    () =>
      createClientStrategy(
        tableListViewFindItems,
        starredEnabled ? decorate : undefined,
        listingLimit,
        () => filterDimensionsRef.current,
        () => customSortFieldsRef.current
      ),
    [tableListViewFindItems, starredEnabled, decorate, listingLimit]
  );

  const dataSource: DataSourceConfig = useMemo(
    () => ({ findItems, onInvalidate, onRefresh, onFetchSuccess }),
    [findItems, onInvalidate, onRefresh, onFetchSuccess]
  );

  const clientStrategyContext = useMemo<ClientStrategyContextValue>(
    () => ({ getItemsSnapshot: getItems, subscribe, filters: filterDimensions }),
    [getItems, subscribe, filterDimensions]
  );

  const tagFilter = filterDimensions[TAG_FILTER_ID];
  const createdByFilter = filterDimensions[CREATED_BY_FILTER_ID];

  // Build `FilterFacetConfig<Tag>` for tags when the tags service is available
  // and the feature isn't explicitly disabled or already configured.
  const tagsFeature = useMemo((): ContentListFeatures['tags'] => {
    if (featuresProp.tags === false) {
      return false;
    }
    if (typeof featuresProp.tags === 'object') {
      return featuresProp.tags;
    }
    if (!tagsService?.getTagList || !tagFilter) {
      return featuresProp.tags;
    }

    const { getTagList } = tagsService;
    const config: FilterFacetConfig<Tag> = {
      getFacets: async ({ filters }) => {
        const narrowed = filterItems(getItems(), filters, filterDimensions);
        const tagCounts = computeFilterCounts(narrowed, tagFilter);
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
  }, [featuresProp.tags, tagsService, tagFilter, getItems, filterDimensions]);

  // Build `FilterFacetConfig<UserProfileEntry>` for user profiles when the
  // service is available and the feature isn't explicitly disabled or already
  // configured.
  //
  // `getFacets` uses the shared `ProfileCache` — `ensureLoaded` populates
  // the cache, then `resolve` reads from it directly.
  const userProfilesFeature = useMemo((): ContentListFeatures['userProfiles'] => {
    if (featuresProp.userProfiles === false) {
      return false;
    }
    if (typeof featuresProp.userProfiles === 'object') {
      return featuresProp.userProfiles;
    }
    if (!userProfilesService || !profileCache || !createdByFilter) {
      return featuresProp.userProfiles;
    }

    const cache = profileCache;
    const config: FilterFacetConfig<UserProfileEntry> = {
      getFacets: async ({ filters }) => {
        const narrowed = filterItems(getItems(), filters, filterDimensions);
        const userCounts = computeFilterCounts(narrowed, createdByFilter);
        const allKeys = Object.keys(userCounts);
        if (allKeys.length === 0) {
          return [];
        }

        // Resolve real user profiles (skip sentinels).
        const realUids = allKeys.filter((k) => !SENTINEL_KEYS.has(k));
        if (realUids.length > 0) {
          await cache.ensureLoaded(realUids);
        }

        return allKeys.map((key) => {
          if (key === MANAGED_USER_FILTER) {
            return {
              key,
              label: MANAGED_USER_LABEL,
              count: userCounts[key] ?? 0,
              data: undefined,
            };
          }
          if (key === NO_CREATOR_USER_FILTER) {
            return {
              key,
              label: NO_CREATOR_USER_LABEL,
              count: userCounts[key] ?? 0,
              data: undefined,
            };
          }
          const profile = cache.resolve(key);
          return {
            key,
            label: profile?.fullName ?? key,
            count: userCounts[key] ?? 0,
            data: profile,
          };
        });
      },
    };
    return config;
  }, [
    featuresProp.userProfiles,
    userProfilesService,
    profileCache,
    createdByFilter,
    getItems,
    filterDimensions,
  ]);

  // Read page size from uiSettings once at mount. Not reactive — page size
  // setting changes during a session are not expected to take effect until reload.
  const [uiSettingsPageSize] = useState(() =>
    core.uiSettings.get<number>(SAVED_OBJECTS_PER_PAGE_ID)
  );

  // Derive queryKeyScope the same way the base provider does.
  const queryKeyScope = rest.queryKeyScope ?? `${rest.id}-listing`;

  // Clear the strategy cache before React Query invalidates — otherwise the
  // post-save refetch reuses stale items keyed by `searchQuery`.
  const contentEditorWithInvalidation = useMemo<ContentEditorConfig | undefined>(() => {
    if (!contentEditor?.onSave) {
      return contentEditor;
    }
    const consumerOnSave = contentEditor.onSave;
    return {
      ...contentEditor,
      onSave: async (args) => {
        await consumerOnSave(args);
        onInvalidate();
      },
    };
  }, [contentEditor, onInvalidate]);

  // Resolved against the outer `ContentEditorKibanaProvider`; consumers never
  // touch `openContentEditor` directly.
  const openContentEditor = useOpenContentEditor();

  // Powers `<Action.ContentEditor />` via `features.contentEditor.open`. The
  // action self-skips when this is `undefined`.
  const open = useContentEditorOpen({
    contentEditor: contentEditorWithInvalidation,
    openContentEditor,
    entityName: rest.labels.entity,
    isReadOnly: rest.isReadOnly,
    queryKeyScope,
  });

  // Rewrite the client-flavored `contentEditor` config into the base
  // `{ open }` shape (or drop it). Every other field passes through unchanged.
  // Custom filters are *registered* here (KQL field definitions + client-side
  // filtering/facet counts via `filterDimensions`), but never auto-rendered in
  // the toolbar. Consumers place a control explicitly with
  // `createFilterControl` / `CustomFilterRenderer`, so registration and
  // placement stay decoupled — see `RecentsFilterRenderer` for the same shape.
  const features: ContentListFeatures = useMemo(() => {
    const baseContentEditor: ContentEditorFeatureConfig | undefined = open ? { open } : undefined;
    const { filters: _filters, sorting: _sorting, ...baseFeatures } = featuresProp;
    return {
      ...baseFeatures,
      sorting: sortingFeature,
      fields: [
        ...(featuresProp.fields ?? []),
        ...Object.values(customFilters).map((filter) => filter.toFieldDefinition()),
      ],
      tags: tagsFeature,
      userProfiles: userProfilesFeature,
      contentEditor: baseContentEditor,
    };
  }, [featuresProp, customFilters, sortingFeature, tagsFeature, userProfilesFeature, open]);

  // Merge: explicit pagination: false > explicit initialPageSize > uiSettings > base default.
  const resolvedFeatures = useMemo<ContentListFeatures>(() => {
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
    <ClientStrategyContext.Provider value={clientStrategyContext}>
      <ContentListProvider
        dataSource={dataSource}
        features={resolvedFeatures}
        services={services}
        profileCache={profileCache}
        item={itemConfigProp}
        {...rest}
        queryKeyScope={queryKeyScope}
      >
        {starredEnabled && <FavoritesSyncEffect favoriteIdsRef={favoriteIdsRef} />}
        {profileCache && <ProfilePrimeEffect getItems={getItems} />}
        {children}
      </ContentListProvider>
    </ClientStrategyContext.Provider>
  );
};
