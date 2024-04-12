/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { getDefaultSort, getSortArray, SortInput } from '../../../common/utils/sorting';
import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';

const isTextBasedSearch = (savedSearch: SavedSearch): boolean => {
  const query = savedSearch.searchSource.getField('query');
  return isTextBasedQuery(query);
};

/**
 * sorting for embeddable, like getSortArray,but returning a default in the case the given sort or dataView is not valid
 */
export function getSortForEmbeddable(
  savedSearch: SavedSearch,
  sort: SortInput | undefined,
  dataView: DataView | undefined,
  uiSettings: IUiSettingsClient | undefined,
  isEsqlMode: boolean
): SortOrder[] {
  const dataView = savedSearch.searchSource.getField('index');
  const isTextBased = isTextBasedSearch(savedSearch);

  if (!sort || !sort.length || !dataView) {
    if (!uiSettings) {
      return [];
    }
    const defaultSortOrder = uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc');
    const hidingTimeColumn = uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false);
    return getDefaultSort(dataView, defaultSortOrder, hidingTimeColumn, isEsqlMode);
  }
  return getSortArray(sort, dataView, isEsqlMode);
}
