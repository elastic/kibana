/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template } from '@kbn/workflows-library';

export interface CatalogFilters {
  /** Free-text match against name + description + categories. */
  search?: string;
  /** A template matches when its `categories` array intersects this list. */
  categories?: string[];
  /**
   * A template matches when it declares no `solutions` (cross-solution) or when
   * its `solutions` array includes this value.
   */
  solution?: string;
}

/**
 * Pure client-side filter over a full catalog fetch. Mirrors the server's
 * `filterTemplates` (`workflows_management/server/library/library_service.ts`)
 * so behavior is consistent whether filtering happens server- or client-side.
 */
export function filterCatalog(templates: Template[], filters?: CatalogFilters): Template[] {
  if (!filters) {
    return templates;
  }

  const search = filters.search?.trim().toLowerCase();
  const categories = filters.categories?.length ? filters.categories : undefined;

  return templates.filter((template) => {
    if (categories && !categories.some((category) => template.categories.includes(category))) {
      return false;
    }

    if (filters.solution) {
      const solutions = template.solutions ?? [];
      const isCrossSolution = solutions.length === 0;
      if (!isCrossSolution && !solutions.includes(filters.solution)) {
        return false;
      }
    }

    if (search) {
      const haystack = [template.name, template.description, ...template.categories]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
}
