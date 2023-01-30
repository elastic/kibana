/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSource } from '@kbn/data-plugin/public';
import { DataViewType, DataView } from '@kbn/data-views-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { SEARCH_FIELDS_FROM_SOURCE, SORT_DEFAULT_ORDER_SETTING } from '../../../../common';
import { DiscoverServices } from '../../../build_services';
import { getSortForSearchSource } from '../../../utils/sorting';

/**
 * Helper function to update the given searchSource before fetching/sharing/persisting
 */
export function updateVolatileSearchSource(
  searchSource: ISearchSource,
  {
    dataView,
    services,
    sort,
  }: {
    dataView: DataView;
    services: DiscoverServices;
    sort?: SortOrder[];
  }
) {
  const { uiSettings, data } = services;
  const usedSort = getSortForSearchSource(
    sort,
    dataView,
    uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
  );
  const useNewFieldsApi = !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);
  searchSource.setField('trackTotalHits', true).setField('sort', usedSort);

  if (dataView.type !== DataViewType.ROLLUP) {
    // Set the date range filter fields from timeFilter using the absolute format. Search sessions requires that it be converted from a relative range
    searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(dataView));
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

/**
 * Helper function to update the persisted part (index, query, filter) of searchSource before fetching/sharing/persisting
 */
export function updatePersistedSearchSource(
  searchSource: ISearchSource,
  {
    dataView,
    services,
  }: {
    dataView: DataView;
    services: DiscoverServices;
  }
) {
  const { data } = services;

  searchSource
    .setField('index', dataView)
    .setField('query', data.query.queryString.getQuery() || null)
    .setField('filter', data.query.filterManager.getFilters());
}

/**
 * Helper function to update the given searchSource before fetching/sharing/persisting
 */
export function updateSearchSource(
  searchSource: ISearchSource,
  persist = true,
  {
    dataView,
    services,
    sort,
  }: {
    dataView: DataView;
    services: DiscoverServices;
    sort: SortOrder[];
  }
) {
  const parentSearchSource = persist ? searchSource : searchSource.getParent()!;

  updatePersistedSearchSource(parentSearchSource, { dataView, services });

  if (!persist) {
    updateVolatileSearchSource(searchSource, { dataView, services, sort });
  }
}
