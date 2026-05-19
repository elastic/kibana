/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Feature types.
export type {
  ContentListFeatures,
  ContentListSupports,
  FilterFacet,
  FilterFacetParams,
  FilterFacetConfig,
} from './types';
export { isSortingConfig, isPaginationConfig, isSearchConfig, isFilterFacetConfig } from './types';

// Sorting feature.
export type { SortField, SortOption, SortingConfig, UseContentListSortReturn } from './sorting';
export { useContentListSort, DEFAULT_SORT_FIELDS, DEFAULT_INITIAL_SORT } from './sorting';

// Pagination feature.
export type { PaginationConfig, UseContentListPaginationReturn } from './pagination';
export { useContentListPagination } from './pagination';

// Search feature.
export type { SearchConfig, UseContentListSearchReturn } from './search';
export { useContentListSearch } from './search';

// Selection feature.
export type { UseContentListSelectionReturn, SelectionConfig } from './selection';
export { useContentListSelection, isSelectionConfig } from './selection';

// Filtering feature.
export type { UseContentListFiltersReturn } from './filtering';
export {
  useContentListFilters,
  useFilterToggle,
  useTagFilterToggle,
  useCreatedByFilterToggle,
  useFilterFacets,
  TAG_FILTER_ID,
  CREATED_BY_FILTER_ID,
} from './filtering';

// Delete feature.
export type {
  DeleteConfirmationModalProps,
  DeleteConfirmationComponentProps,
  UseDeleteConfirmationOptions,
  UseDeleteConfirmationReturn,
} from '../components/delete';
export {
  DeleteConfirmationModal,
  DeleteConfirmationComponent,
  useDeleteConfirmation,
} from '../components/delete';
