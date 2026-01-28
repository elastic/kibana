/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useContentListConfig } from '../../context';
import { DEFAULT_SORT_FIELDS } from './types';

/**
 * Hook to get the list of sortable field names from the provider configuration.
 *
 * This derives the sortable fields from either:
 * - `sorting.fields` (simplified format)
 * - `sorting.options` (explicit format - extracts unique fields)
 * - Default fields (title, updatedAt) if no sorting config provided
 *
 * Use this hook to determine which columns should be sortable in the table.
 *
 * @example
 * ```tsx
 * const sortableFields = useSortableFields();
 * // Returns ['title', 'updatedAt', 'status']
 *
 * // Check if a column should be sortable
 * const isSortable = sortableFields.includes(columnId);
 * ```
 */
export const useSortableFields = (): string[] => {
  const { features } = useContentListConfig();

  return useMemo(() => {
    const sortingConfig = typeof features.sorting === 'object' ? features.sorting : undefined;

    // Priority 1: Use fields if provided (new simplified format).
    if (sortingConfig?.fields && sortingConfig.fields.length > 0) {
      return sortingConfig.fields.map((f) => f.field);
    }

    // Priority 2: Extract unique fields from options (explicit format).
    if (sortingConfig?.options && sortingConfig.options.length > 0) {
      const uniqueFields = new Set(sortingConfig.options.map((o) => o.field));
      return Array.from(uniqueFields);
    }

    // Priority 3: Default fields.
    return DEFAULT_SORT_FIELDS.map((f) => f.field);
  }, [features.sorting]);
};
