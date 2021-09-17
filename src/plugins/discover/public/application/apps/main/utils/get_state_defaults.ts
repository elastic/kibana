/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { IUiSettingsClient } from 'kibana/public';
import { DEFAULT_COLUMNS_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';
import { SavedSearch } from '../../../../saved_searches';
import { DataPublicPluginStart } from '../../../../../../data/public';

import { AppState } from '../services/discover_state';
import { getDefaultSort, getSortArray } from '../components/doc_table';

function getDefaultColumns(savedSearch: SavedSearch, config: IUiSettingsClient) {
  if (savedSearch.columns && savedSearch.columns.length > 0) {
    return [...savedSearch.columns];
  }
  return [...config.get(DEFAULT_COLUMNS_SETTING)];
}

export function getStateDefaults({
  config,
  data,
  savedSearch,
}: {
  config: IUiSettingsClient;
  data: DataPublicPluginStart;
  savedSearch: SavedSearch;
}) {
  const searchSource = savedSearch.searchSource;
  const indexPattern = savedSearch.searchSource.getField('index');
  const query = searchSource.getField('query') || data.query.queryString.getDefaultQuery();
  const sort = getSortArray(savedSearch.sort, indexPattern!);
  const columns = getDefaultColumns(savedSearch, config);

  const defaultState = {
    query,
    sort: !sort.length
      ? getDefaultSort(indexPattern, config.get(SORT_DEFAULT_ORDER_SETTING, 'desc'))
      : sort,
    columns,
    index: indexPattern!.id,
    interval: 'auto',
    filters: cloneDeep(searchSource.getOwnField('filter')),
    hideChart: undefined,
    savedQuery: undefined,
  } as AppState;
  if (savedSearch.grid) {
    defaultState.grid = savedSearch.grid;
  }
  if (savedSearch.hideChart) {
    defaultState.hideChart = savedSearch.hideChart;
  }

  return defaultState;
}
