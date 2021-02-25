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
export function updateSearchSource({
  indexPattern,
  services,
  sort,
  columns,
  useNewFieldsApi,
  showUnmappedFields,
  persistentSearchSource,
  volatileSearchSource,
}: {
  indexPattern: IndexPattern;
  services: DiscoverServices;
  sort: SortOrder[];
  columns: string[];
  useNewFieldsApi: boolean;
  showUnmappedFields?: boolean;
  persistentSearchSource: ISearchSource;
  volatileSearchSource?: ISearchSource;
}) {
  const { uiSettings, data } = services;
  const usedSort = getSortForSearchSource(
    sort,
    indexPattern,
    uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
  );

  persistentSearchSource
    .setField('index', indexPattern)
    .setField('query', data.query.queryString.getQuery() || null)
    .setField('filter', data.query.filterManager.getFilters());

  if (volatileSearchSource) {
    volatileSearchSource
      .setField('size', uiSettings.get(SAMPLE_SIZE_SETTING))
      .setField('sort', usedSort)
      .setField('highlightAll', true)
      .setField('version', true)
      // Even when searching rollups, we want to use the default strategy so that we get back a
      // document-like response.
      .setPreferredSearchStrategyId('default');

    if (useNewFieldsApi) {
      volatileSearchSource.removeField('fieldsFromSource');
      const fields: Record<string, string> = { field: '*' };
      if (showUnmappedFields) {
        fields.include_unmapped = 'true';
      }
      volatileSearchSource.setField('fields', [fields]);
    } else {
      volatileSearchSource.removeField('fields');
      const fieldNames = indexPattern.fields.map((field) => field.name);
      volatileSearchSource.setField('fieldsFromSource', fieldNames);
    }
  }
}
