/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Content List Provider - Feature-based modular architecture
 *
 * ## Architecture
 *
 * This package uses a layered architecture with feature-based organization:
 *
 * **Layer 1: ContentListProvider** - Static configuration context
 * - Holds configuration props (entity names, actions, data source, feature configs)
 * - Accessed via `useContentListConfig()`
 * - Values don't change during component lifecycle
 *
 * **Layer 2: ContentListStateProvider** - Runtime state management
 * - Manages dynamic state (items, loading, search, filters, pagination)
 * - Accessed via feature-based hooks (useContentListItems, useContentListSearch, etc.)
 * - Current implementation uses useReducer
 *
 * ## Features
 *
 * Each feature is encapsulated in its own directory with colocated types and hooks:
 * - search: Search functionality
 * - filtering: Filter management
 * - sorting: Sort controls
 * - pagination: Page navigation
 * - selection: Item selection and bulk actions
 * - global_actions: List-level actions (onCreate, etc.)
 * - analytics: Analytics integration
 * - content_editor: Content editor integration
 */

export type {
  ContentListProviderContextValue as ContentListConfigValue,
  ContentListProviderProps,
  ContentListCoreConfig,
  ContentListConfig,
  ContentListServices,
} from './context';

export { ContentListProvider, useContentListConfig } from './context';

export type {
  DataSourceConfig,
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  ResolvedFilters,
  TransformConfig,
} from './datasource';

export { defaultTransform } from './datasource';

export type {
  FilterDisplayState,
  UseQueryFilterOptions,
  QueryFilterType,
  QueryFilterState,
  QueryFilterActions,
  IdentityResolver,
  SearchConfig,
  FilteringConfig,
  ActiveFilters,
  TagFilters,
  CustomFilterDefinition,
  SortingConfig,
  SortOption,
  SortField,
  PaginationConfig,
  SelectionActions,
  GlobalActionsConfig,
  AnalyticsConfig,
  ContentEditorConfig,
  ContentEditorSaveArgs,
  ContentEditorValidator,
  ContentEditorValidators,
  ContentListFeatures,
  Supports,
} from './features';

export {
  useContentListSearch,
  useQueryFilter,
  useContentListFilters,
  useFilterDisplay,
  useContentListSort,
  useSortableFields,
  useContentListPagination,
  useContentListSelection,
  useOpenContentEditor,
  createActivityAppendRows,
  DEFAULT_SORT_FIELDS,
} from './features';

export type {
  ContentListItem,
  TransformFunction,
  ItemConfig,
  CustomActionConfig,
  ActionHandler,
  ActionConfig,
  ActionConfigObject,
} from './item';

export { useContentListItemsQuery, contentListKeys } from './query';

export { useContentListState, useContentListItems } from './state';

export type { ContentListState } from './state';

// Service adapters for Kibana providers.
export { createUserProfileAdapter } from './services';

/**
 * Default debounce delay for server-side search requests.
 * Used by `ContentListServerKibanaProvider` to prevent excessive requests while typing.
 */
export const SERVER_SEARCH_DEBOUNCE_MS = 300;
