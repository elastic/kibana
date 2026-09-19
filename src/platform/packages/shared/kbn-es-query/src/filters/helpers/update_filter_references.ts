/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '..';
import { isCombinedFilter } from '../build_filters/combined_filter';

/**
 * Updates filters that point to the old data view ID, including nested filters inside AND/OR groups.
 *
 * Example: changing the data view ID from X to D updates meta.index like this:
 *   AND group:          X -> D
 *     bytes filter:     X -> D
 *     status filter:    Y -> Y
 *     unreferenced:     undefined -> undefined
 */
export function updateFilterReferences(
  filters: Filter[],
  fromDataView: string,
  toDataView: string | undefined
): Filter[] {
  return (filters || []).map((filter) => {
    let updatedFilter = filter;
    // Update data view references in nested filters too, including those inside nested AND/OR groups.
    if (isCombinedFilter(filter)) {
      const params = updateFilterReferences(filter.meta.params, fromDataView, toDataView);

      if (params.some((child, index) => child !== filter.meta.params[index])) {
        updatedFilter = { ...filter, meta: { ...filter.meta, params } };
      }
    }

    if (updatedFilter.meta.index !== fromDataView) {
      return updatedFilter;
    }

    return {
      ...updatedFilter,
      meta: {
        ...updatedFilter.meta,
        index: toDataView,
      },
    };
  });
}
