/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    columns,
    useNewFieldsApi,
  }: {
    indexPattern: IndexPattern;
    services: DiscoverServices;
    sort: SortOrder[];
    columns: string[];
    useNewFieldsApi: boolean;
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
  if (useNewFieldsApi) {
    searchSource.removeField('fieldsFromSource');
    searchSource.setField('fields', ['*']);
  } else {
    searchSource.removeField('fields');
    const fieldNames = indexPattern.fields.map((field) => field.name);
    searchSource.setField('fieldsFromSource', fieldNames);
  }
  return searchSource;
}
