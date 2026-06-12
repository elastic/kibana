/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchSource } from '@kbn/data-plugin/public';
import { DataViewType, type DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { SORT_DEFAULT_ORDER_SETTING, getSortForSearchSource } from '@kbn/discover-utils';
import type { DiscoverServices } from '../../../build_services';

/**
 * Helper function to update the given searchSource before fetching/sharing/persisting
 */
export function updateVolatileSearchSource(
  searchSource: ISearchSource,
  {
    dataView,
    services,
    sort,
    inputTimeRange,
  }: {
    dataView: DataView;
    services: DiscoverServices;
    sort?: SortOrder[];
    inputTimeRange?: TimeRange;
  }
) {
  const { uiSettings, data } = services;

  const usedSort = getSortForSearchSource({
    sort,
    dataView,
    defaultSortDir: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    includeTieBreaker: true,
  });
  searchSource.setField('sort', usedSort);

  searchSource.setField('trackTotalHits', true);

  if (dataView.type !== DataViewType.ROLLUP) {
    // Set the date range filter fields from timeFilter using the absolute format. Search sessions requires that it be converted from a relative range
    searchSource.setField(
      'filter',
      data.query.timefilter.timefilter.createFilter(dataView, inputTimeRange)
    );
  }

  searchSource.removeField('fieldsFromSource');
  searchSource.setField('fields', [{ field: '*', include_unmapped: true }]);
}
