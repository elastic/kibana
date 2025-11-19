/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '../item';
import type { ActiveFilters } from './filtering';

/**
 * Analytics tracking configuration for content list interactions.
 *
 * Callbacks are invoked for various user interactions to enable analytics tracking.
 * Works with `ContentListItem` (standardized format).
 *
 * @example
 * ```tsx
 * <ContentListProvider
 *   analytics={{
 *     onSearch: (query) => trackEvent('content_list_search', { query }),
 *     onItemClick: (item) => trackEvent('content_list_click', { id: item.id }),
 *   }}
 * />
 * ```
 */
export interface AnalyticsConfig {
  /** Called when an item is viewed (e.g., in preview). */
  onItemView?: (item: ContentListItem) => void;
  /** Called when an item is clicked (primary action). */
  onItemClick?: (item: ContentListItem) => void;
  /** Called when search query changes. */
  onSearch?: (query: string) => void;
  /** Called when filters change. */
  onFilterChange?: (filters: ActiveFilters) => void;
  /** Called when sort configuration changes. */
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  /** Called when a bulk action is performed on selected items. */
  onBulkAction?: (action: string, items: ContentListItem[]) => void;
}
