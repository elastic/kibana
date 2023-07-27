/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { EsQuerySortValue, SortDirection } from '@kbn/data-plugin/common';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { getSort } from './get_sort';
import {
  getESQuerySortForTimeField,
  // getESQuerySortForTieBreaker,
  // getTieBreakerField,
} from './get_es_query_sort';

/**
 * Prepares sort for search source, that's sending the request to ES
 * - Adds default sort if necessary
 * - Handles the special case when there's sorting by date_nanos typed fields
 *   the addon of the numeric_type guarantees the right sort order
 *   when there are indices with date and indices with date_nanos field
 */
export function getSortForSearchSource(
  sort: SortOrder[] | undefined,
  dataView: DataView | undefined,
  uiSettings: Pick<IUiSettingsClient, 'get'>
): EsQuerySortValue[] {
  const defaultDirection = uiSettings.get(SORT_DEFAULT_ORDER_SETTING) || 'desc';

  if (!sort || !dataView || (Array.isArray(sort) && sort.length === 0)) {
    if (dataView?.timeFieldName) {
      // sorting by index order
      return [{ _doc: defaultDirection } as EsQuerySortValue];
    } else {
      return [{ _score: defaultDirection } as EsQuerySortValue];
    }
  }

  const { timeFieldName } = dataView;
  const sortPairs = getSort(sort, dataView);

  const sortForSearchSource = sortPairs.map((sortPair: Record<string, string>) => {
    if (timeFieldName && sortPair[timeFieldName]) {
      return getESQuerySortForTimeField(
        timeFieldName,
        sortPair[timeFieldName] as SortDirection,
        dataView.isTimeNanosBased()
      );
    }
    return sortPair as EsQuerySortValue;
  });

  // TODO: do we need to have a tie breaker like this?
  // if (dataView.isTimeBased() && sortPairs.length) {
  //   const firstSortPair = sortPairs[0];
  //   const firstPairSortDir = Array.isArray(firstSortPair)
  //     ? firstSortPair[1]
  //     : Object.values(firstSortPair)[0];
  //   sortForSearchSource.push(
  //     getESQuerySortForTieBreaker(getTieBreakerField(dataView, uiSettings), firstPairSortDir)
  //   );
  // }

  return sortForSearchSource;
}
