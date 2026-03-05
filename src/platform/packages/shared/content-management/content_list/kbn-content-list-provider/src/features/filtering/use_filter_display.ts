/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContentListConfig } from '../../context';
import type { FilterDisplayState } from './types';

/**
 * Hook to determine which filters should be displayed based on provider configuration
 * and service availability.
 *
 * This hook centralizes the logic for determining filter visibility using both
 * the `supports` flags (which reflect service availability) and feature config.
 *
 * @returns A {@link FilterDisplayState} object indicating which filters are available.
 *
 * @example
 * ```tsx
 * const { hasTags, hasSorting } = useFilterDisplay();
 *
 * return (
 *   <>
 *     {hasTags && <TagsFilter />}
 *     {hasSorting && <SortFilter />}
 *   </>
 * );
 * ```
 */
export const useFilterDisplay = (): FilterDisplayState => {
  const { supports } = useContentListConfig();

  const hasSorting = supports.sorting;
  const hasSearch = supports.search;
  const hasTags = supports.tags;

  return {
    hasSorting,
    hasSearch,
    hasTags,
    hasFilters: hasSorting || hasTags,
  };
};
