/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActiveFilters } from '../datasource';
import type { ContentListQueryModel } from './types';

/**
 * Convert a {@link ContentListQueryModel} to the {@link ActiveFilters} shape
 * expected by `findItems`.
 *
 * Maps:
 * - `model.search` → `filters.search`
 * - `model.flags.starred` → `filters.starredOnly`
 * - `model.filters[field]` → `filters[field]` as `IncludeExcludeFilter`
 */
export const toFindItemsFilters = (model: ContentListQueryModel): ActiveFilters => {
  const result: ActiveFilters = {};

  // Free text search.
  if (model.search) {
    result.search = model.search;
  }

  // Boolean flags.
  if (model.flags.starred) {
    result.starredOnly = true;
  }

  // Field filters — always emit arrays so downstream consumers can safely
  // access `.include.length` / `.exclude.length` without null checks.
  for (const [fieldName, filter] of Object.entries(model.filters)) {
    if (filter.include.length > 0 || filter.exclude.length > 0) {
      result[fieldName] = {
        include: filter.include,
        exclude: filter.exclude,
      };
    }
  }

  return result;
};
