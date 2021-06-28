/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSortForSearchSource } from '../../../angular/doc_table';
import { SAMPLE_SIZE_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';
import { IndexPattern, ISearchSource } from '../../../../../../data/common';
import { SortOrder } from '../../../../saved_searches/types';
import { DiscoverServices } from '../../../../build_services';
import { indexPatterns as indexPatternsUtils } from '../../../../../../data/public';

/**
 * Helper function to update the given searchSource before fetching/sharing/persisting
 */
export function updateSearchSource(
  searchSource: ISearchSource,
  persist = true,
  {
    indexPattern,
    services,
    sort,
    useNewFieldsApi,
  }: {
    indexPattern: IndexPattern;
    services: DiscoverServices;
    sort: SortOrder[];
    useNewFieldsApi: boolean;
  }
) {
  const { uiSettings, data } = services;
  const usedSort = getSortForSearchSource(
    sort,
    indexPattern,
    uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
  );
  const usedSearchSource = persist ? searchSource : searchSource.getParent()!;

  usedSearchSource
    .setField('index', indexPattern)
    .setField('query', data.query.queryString.getQuery() || null)
    .setField('filter', data.query.filterManager.getFilters());

  if (!persist) {
    searchSource
      .setField('trackTotalHits', true)
      .setField('size', uiSettings.get(SAMPLE_SIZE_SETTING))
      .setField('sort', usedSort)
      .setField('highlightAll', true)
      .setField('version', true)
      // Even when searching rollups, we want to use the default strategy so that we get back a
      // document-like response.
      .setPreferredSearchStrategyId('default');

    // this is not the default index pattern, it determines that it's not of type rollup
    if (indexPatternsUtils.isDefault(indexPattern)) {
      searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern));
    }

    if (useNewFieldsApi) {
      searchSource.removeField('fieldsFromSource');
      const fields: Record<string, string> = { field: '*' };

      fields.include_unmapped = 'true';

      searchSource.setField('fields', [fields]);
    } else {
      searchSource.removeField('fields');
    }
  }
}
