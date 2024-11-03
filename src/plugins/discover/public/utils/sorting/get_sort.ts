/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { IUiSettingsClient } from '@kbn/core/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { getDefaultSort, getSortArray, SortInput } from '../../../common/utils/sorting';

/**
 * sorting for embeddable, like getSortArray,but returning a default in the case the given sort or dataView is not valid
 */
export function getSortForEmbeddable(
  sort: SortInput | undefined,
  dataView: DataView | undefined,
  uiSettings: IUiSettingsClient | undefined,
  isEsqlMode: boolean
): SortOrder[] {
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
