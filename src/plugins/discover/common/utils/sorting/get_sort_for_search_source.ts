/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { EsQuerySortValue } from '@kbn/data-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { getSort } from './get_sort';

/**
 * Prepares sort for search source, that's sending the request to ES
 * - Adds default sort if necessary
 * - Handles the special case when there's sorting by date_nanos typed fields
 *   the addon of the numeric_type guarantees the right sort order
 *   when there are indices with date and indices with date_nanos field
 */
export function getSortForSearchSource(
  sort?: SortOrder[],
  dataView?: DataView,
  defaultDirection: string = 'desc'
): EsQuerySortValue[] {
  if (!sort || !dataView || (Array.isArray(sort) && sort.length === 0)) {
    if (dataView?.timeFieldName) {
      // sorting by index order
      return [{ _doc: defaultDirection } as EsQuerySortValue];
    } else {
      return [{ _score: defaultDirection } as EsQuerySortValue];
    }
  }
  const { timeFieldName } = dataView;
  return getSort(sort, dataView).map((sortPair: Record<string, string>) => {
    if (dataView.isTimeNanosBased() && timeFieldName && sortPair[timeFieldName]) {
      return {
        [timeFieldName]: {
          order: sortPair[timeFieldName],
          numeric_type: 'date_nanos',
        },
      } as EsQuerySortValue;
    }
    return sortPair as EsQuerySortValue;
  });
}
