/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Content List Provider
 *
 * A modular, feature-based architecture for building content listing UIs.
 */

// Provider.
export { ContentListProvider, useContentListConfig } from './src/context';
export type {
  ContentListProviderProps,
  ContentListIdentity,
  ContentListLabels,
  ContentListCoreConfig,
  ContentListConfig,
  ContentListServices,
} from './src/context';

// Hooks.
export { useContentListItems, useContentListState } from './src/state';
export type { ContentListQueryData } from './src/state';

// Phase.
export {
  useContentListPhase,
  useIsInitialLoad,
  useIsEmpty,
  useIsFiltering,
  useIsFiltered,
  useIsPopulated,
  derivePhase,
  derivePhaseFromState,
} from './src/phase';
export type { ContentListPhase, DerivePhaseInput } from './src/phase';

export {
  isFilterFacetConfig,
  useContentListSort,
  useContentListSearch,
  useContentListPagination,
  useContentListSelection,
  useContentListFilters,
  useFilterToggle,
  useTagFilterToggle,
  useCreatedByFilterToggle,
  useFilterFacets,
  isSortingConfig,
  isPaginationConfig,
  isSearchConfig,
  isSelectionConfig,
  TAG_FILTER_ID,
  CREATED_BY_FILTER_ID,
  DEFAULT_SORT_FIELDS,
  DEFAULT_INITIAL_SORT,
  DeleteConfirmationModal,
  DeleteConfirmationComponent,
  useDeleteConfirmation,
} from './src/features';

// State.
export { CONTENT_LIST_ACTIONS } from './src/state';
export type { ContentListAction } from './src/state';

// Types.
export type { ContentListItem, ContentListItemConfig } from './src/item';
export type {
  ContentListFeatures,
  ContentListSupports,
  FilterFacet,
  FilterFacetParams,
  FilterFacetConfig,
  SortField,
  SortOption,
  SortingConfig,
  UseContentListSortReturn,
  PaginationConfig,
  UseContentListPaginationReturn,
  SearchConfig,
  UseContentListSearchReturn,
  SelectionConfig,
  UseContentListSelectionReturn,
  UseContentListFiltersReturn,
  DeleteConfirmationModalProps,
  DeleteConfirmationComponentProps,
  UseDeleteConfirmationOptions,
  UseDeleteConfirmationReturn,
} from './src/features';
export type {
  ActiveFilters,
  IncludeExcludeFilter,
  IncludeExcludeFlag,
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  DataSourceConfig,
} from './src/datasource';
export { getIncludeExcludeFlag } from './src/datasource';

// Query model.
export type {
  ContentListQueryModel,
  QueryFilterValue,
  FieldDefinition,
  FlagDefinition,
} from './src/query_model';
export { EMPTY_MODEL, toFindItemsFilters, useQueryModel } from './src/query_model';

// Services.
export {
  ProfileCache,
  ProfileCacheContext,
  useProfileCache,
  useProfileCacheVersion,
  useProfile,
} from './src/services';
export type { ContentListUserProfilesServices, UserProfileEntry } from './src/services';

// Item constants (sentinel keys, labels, and utilities).
export {
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  MANAGED_USER_LABEL,
  NO_CREATOR_USER_LABEL,
  SENTINEL_KEYS,
  getCreatorKey,
} from './src/item';

// Utilities.
export { contentListKeys, contentListQueryClient } from './src/query';
