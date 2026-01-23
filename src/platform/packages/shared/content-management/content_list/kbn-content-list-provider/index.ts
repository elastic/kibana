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

// Main providers
export {
  ContentListProvider,
  useContentListConfig,
  type ContentListProviderProps,
  type ContentListProviderContextValue as ContentListConfigValue,
} from './src/context';

// Configuration hook
export { useContentListState } from './src/state';

// State hooks
export { useContentListItems } from './src/state';

// Feature hooks
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
  ContentEditorActionProvider,
} from './src/features';

// Filter display types
export type { FilterDisplayState } from './src/features';

// Query filter types
export type {
  UseQueryFilterOptions,
  QueryFilterType,
  QueryFilterState,
  QueryFilterActions,
  IdentityResolver,
} from './src/features';

// Common types
export type { ContentListItem, TransformFunction } from './src/item';

// Datasource types
export type {
  DataSourceConfig,
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
} from './src/datasource';
export { defaultTransform } from './src/datasource';

// Item types
export type {
  ItemConfig,
  CustomActionConfig,
  ActionHandler,
  ActionConfig,
  ActionConfigObject,
} from './src/item';

// Feature types
export type {
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
} from './src/features';

// Sorting constants
export { DEFAULT_SORT_FIELDS } from './src/features';

// State types
export type { ContentListState } from './src/state';

// Query hooks
export { useContentListItemsQuery, contentListKeys } from './src/query';

// Configuration types
export type {
  ContentListCoreConfig,
  ContentListConfig,
  ContentListServices,
  ContentListKibanaServices,
  ContentListKibanaProviderBaseProps,
} from './src/context';

// Feature configuration
export type { ContentListFeatures, Supports } from './src/features';

// Service adapters for Kibana providers.
export { createUserProfileAdapter } from './src/services';

// Constants.
export { SERVER_SEARCH_DEBOUNCE_MS } from './src';
