/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';
import type { SearchFilterConfig, Query } from '@elastic/eui';
import type { ContentListConfigValue } from '@kbn/content-list-provider';
import type { KnownFilterId } from './parse_children';
import { StarredRenderer } from './renderers/starred_renderer';
import { SortRenderer } from './renderers/sort_renderer';
import { TagsRenderer } from './renderers/tags_renderer';
import { CreatedByRenderer } from './renderers/created_by_renderer';
import { createDynamicCustomFilterRenderer } from './renderers/custom_filter_renderer';

/**
 * Cache for custom filter renderer components.
 *
 * {@link createDynamicCustomFilterRenderer} creates a new component type each time it's called.
 * If we call it on every render, React sees a different component and unmounts/remounts,
 * which closes the popover on selection. By caching components by field ID,
 * we ensure stable component references across re-renders.
 *
 * Unlike the old approach that baked config into the component, these dynamic renderers
 * read config from {@link useContentListConfig} on each render. This means config changes
 * (options, name, `multiSelect`) are properly reflected without cache invalidation.
 */
const customFilterRendererCache = new Map<
  string,
  ComponentType<{ query: Query; onChange?: (query: Query) => void }>
>();

/**
 * Context for building filters, containing the provider configuration and filter display state.
 */
export interface FilterBuilderContext {
  /** Provider configuration from {@link useContentListConfig}. */
  config: ContentListConfigValue;
  /** Filter display state from provider, indicating which filter types are available. */
  filterDisplay: {
    /** Whether starred filtering is available. */
    hasStarred: boolean;
    /** Whether sorting is available. */
    hasSorting: boolean;
    /** Whether tag filtering is available. */
    hasTags: boolean;
    /** Whether user filtering is available. */
    hasUsers: boolean;
    /** Whether any filtering is available. */
    hasFilters: boolean;
  };
}

/**
 * Checks if a filter is enabled based on the provider configuration.
 *
 * @param filterId - The filter ID to check.
 * @param filterDisplay - The filter display state from the provider.
 * @param config - The content list configuration.
 * @returns `true` if the filter should be displayed.
 */
const isFilterEnabled = (
  filterId: string,
  filterDisplay: FilterBuilderContext['filterDisplay'],
  config: ContentListConfigValue
): boolean => {
  switch (filterId) {
    case 'starred':
      return filterDisplay.hasStarred;
    case 'sort':
      return filterDisplay.hasSorting;
    case 'tags':
      return filterDisplay.hasTags;
    case 'createdBy':
      return filterDisplay.hasUsers;
    default: {
      // Custom filter - check if defined in provider config.
      const filteringConfig =
        typeof config.features.filtering === 'object' ? config.features.filtering : undefined;
      return Boolean(filteringConfig?.custom?.[filterId]);
    }
  }
};

/**
 * Builds a single `SearchFilterConfig` for a given filter ID.
 *
 * @param filterId - The filter ID to build the configuration for.
 * @param config - The content list configuration.
 * @returns A `SearchFilterConfig` object for `EuiSearchBar`, or `null` if the filter is unknown.
 */
const buildFilter = (
  filterId: string,
  config: ContentListConfigValue
): SearchFilterConfig | null => {
  switch (filterId as KnownFilterId | string) {
    case 'starred':
      return {
        type: 'custom_component',
        component: StarredRenderer,
      };

    case 'sort':
      return {
        type: 'custom_component',
        component: SortRenderer,
      };

    case 'tags':
      return {
        type: 'custom_component',
        component: TagsRenderer,
      };

    case 'createdBy':
      return {
        type: 'custom_component',
        component: CreatedByRenderer,
      };

    default: {
      // Custom filter - look up from provider config.
      const filteringConfig =
        typeof config.features.filtering === 'object' ? config.features.filtering : undefined;
      const customConfig = filteringConfig?.custom?.[filterId];

      if (!customConfig) {
        // eslint-disable-next-line no-console
        console.warn(
          `[ContentListToolbar] Unknown filter "${filterId}" - not defined in filtering.custom config`
        );
        return null;
      }

      // Get or create cached renderer component.
      // This prevents unmount/remount on each render which would close the popover.
      // The dynamic renderer reads config from context, so config changes are reflected.
      let CachedRenderer = customFilterRendererCache.get(filterId);
      if (!CachedRenderer) {
        CachedRenderer = createDynamicCustomFilterRenderer(filterId);
        customFilterRendererCache.set(filterId, CachedRenderer);
      }

      // Use `custom_component` with `SelectableFilterPopover` for consistent appearance.
      return {
        type: 'custom_component',
        component: CachedRenderer,
      };
    }
  }
};

/**
 * Builds `EuiSearchBar` filter configurations from parsed filter data.
 *
 * Takes filter IDs (from {@link parseFiltersFromChildren}) and builds
 * the actual `SearchFilterConfig[]` array for `EuiSearchBar`'s `filters` prop.
 *
 * @param filterIds - Array of filter IDs in desired order.
 * @param context - The {@link FilterBuilderContext} containing config and `filterDisplay`.
 * @returns An array of `SearchFilterConfig` for `EuiSearchBar`.
 *
 * @example
 * ```tsx
 * const filters = buildSearchBarFilters(
 *   ['starred', 'tags', 'status'],
 *   { config, filterDisplay }
 * );
 * ```
 */
export const buildSearchBarFilters = (
  filterIds: string[],
  context: FilterBuilderContext
): SearchFilterConfig[] => {
  const { config, filterDisplay } = context;

  return filterIds
    .filter((id) => isFilterEnabled(id, filterDisplay, config))
    .map((id) => buildFilter(id, config))
    .filter((filter): filter is SearchFilterConfig => filter !== null);
};
