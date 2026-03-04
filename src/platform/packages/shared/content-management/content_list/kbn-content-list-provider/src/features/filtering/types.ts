/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActiveFilters } from '../../datasource';

/**
 * State returned by `useFilterDisplay` indicating which filter UI elements should be rendered.
 */
export interface FilterDisplayState {
  /** Whether any filter popover buttons should be shown (sorting, tags, or starred). Search is separate. */
  hasFilters: boolean;
  /** Whether sorting is enabled. */
  hasSorting: boolean;
  /** Whether search is enabled. */
  hasSearch: boolean;
  /** Whether tags filtering should be shown. */
  hasTags: boolean;
  /** Whether the starred filter toggle should be shown. */
  hasStarred: boolean;
}

/**
 * Return type for the {@link useContentListFilters} hook.
 */
export interface UseContentListFiltersReturn {
  /** Currently active filters (derived from query text and state). */
  filters: ActiveFilters;
  /** Clear all filters and search text. */
  clearFilters: () => void;
}
