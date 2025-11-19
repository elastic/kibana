/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContentListConfig } from '../../context';

/**
 * State returned by `useFilterDisplay` indicating which filter UI elements should be rendered.
 */
export interface FilterDisplayState {
  /** Whether any filters should be shown (sorting or any active filters). */
  hasFilters: boolean;
  /** Whether sorting is enabled (always `true` unless sorting is explicitly `false`). */
  hasSorting: boolean;
  /** Whether tags filtering should be shown (based on `supports.tags` and config). */
  hasTags: boolean;
  /** Whether user/createdBy filtering should be shown (based on `supports.userProfiles` and config). */
  hasUsers: boolean;
  /** Whether custom filters should be shown (based on config). */
  hasCustomFilters: boolean;
  /** Whether starred filtering should be shown (based on `supports.starred`). */
  hasStarred: boolean;
}

/**
 * Hook to determine which filters should be displayed based on provider configuration
 * and services availability.
 *
 * This hook centralizes the logic for determining filter visibility, using both
 * the `supports` flags (which indicate service availability) and config settings.
 *
 * @example
 * ```tsx
 * function MyFilter() {
 *   const { hasTags, hasStarred } = useFilterDisplay();
 *
 *   return (
 *     <>
 *       {hasTags && <TagsFilter />}
 *       {hasStarred && <StarredFilter />}
 *     </>
 *   );
 * }
 * ```
 */
export const useFilterDisplay = (): FilterDisplayState => {
  const { features, supports } = useContentListConfig();
  const { sorting, filtering } = features;

  // If sorting is explicitly disabled, return all false.
  if (sorting === false) {
    return {
      hasFilters: false,
      hasSorting: false,
      hasTags: false,
      hasUsers: false,
      hasCustomFilters: false,
      hasStarred: false,
    };
  }

  const hasSorting = true;
  let hasTags = false;
  let hasUsers = false;
  let hasCustomFilters = false;
  let hasStarred = false;

  if (typeof filtering === 'object') {
    // Tags: enabled if service is available AND not explicitly disabled in config.
    hasTags = supports.tags && filtering?.tags !== false;
    // Users: enabled if service is available AND not explicitly disabled in config.
    hasUsers = supports.userProfiles && filtering?.users !== false;
    // Custom filters: enabled if any custom filters are configured.
    hasCustomFilters =
      typeof filtering.custom === 'object' && Object.keys(filtering.custom).length > 0;
    // Starred: enabled if service is available AND not explicitly disabled in config.
    hasStarred = supports.starred && filtering?.starred !== false;
  } else if (filtering === true) {
    // Shorthand: `filtering: true` enables tags, users, and starred (if services available).
    hasTags = supports.tags;
    hasUsers = supports.userProfiles;
    hasStarred = supports.starred;
  }

  return {
    hasSorting,
    hasTags,
    hasUsers,
    hasCustomFilters,
    hasStarred,
    hasFilters: hasSorting || hasTags || hasUsers || hasCustomFilters || hasStarred,
  };
};
