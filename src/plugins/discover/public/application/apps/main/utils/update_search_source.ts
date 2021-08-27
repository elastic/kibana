/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPattern } from '../../../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { ISearchSource } from '../../../../../../data/common/search/search_source/types';
import { indexPatterns as indexPatternsUtils } from '../../../../../../data/public';
import { SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';
import type { DiscoverServices } from '../../../../build_services';
import type { SortOrder } from '../../../../saved_searches/types';
import { getSortForSearchSource } from '../components/doc_table/lib/get_sort_for_search_source';

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
  const parentSearchSource = persist ? searchSource : searchSource.getParent()!;

  parentSearchSource
    .setField('index', indexPattern)
    .setField('query', data.query.queryString.getQuery() || null)
    .setField('filter', data.query.filterManager.getFilters());

  if (!persist) {
    const usedSort = getSortForSearchSource(
      sort,
      indexPattern,
      uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
    );
    searchSource
      .setField('trackTotalHits', true)
      .setField('sort', usedSort)
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
