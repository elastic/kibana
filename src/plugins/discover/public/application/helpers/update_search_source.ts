/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSortForSearchSource } from '../angular/doc_table';
import { SAMPLE_SIZE_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';
import { IndexPattern, ISearchSource } from '../../../../data/common/';
import { SortOrder } from '../../saved_searches/types';
import { DiscoverServices } from '../../build_services';

/**
 * Helper function to update the given searchSource before fetching/sharing/persisting
 */
export function updateSearchSource(
  searchSource: ISearchSource,
  {
    indexPattern,
    services,
    sort,
  }: {
    indexPattern: IndexPattern;
    services: DiscoverServices;
    sort: SortOrder[];
  }
) {
  const { uiSettings, data } = services;
  const usedSort = getSortForSearchSource(
    sort,
    indexPattern,
    uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
  );

  searchSource
    .setField('index', indexPattern)
    .setField('size', uiSettings.get(SAMPLE_SIZE_SETTING))
    .setField('sort', usedSort)
    .setField('query', data.query.queryString.getQuery() || null)
    .setField('filter', data.query.filterManager.getFilters());
  return searchSource;
}
