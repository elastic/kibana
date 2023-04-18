/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { isSortable } from './get_sort';

/**
 * use in case the user didn't manually sort.
 * the default sort is returned depending of the data view
 */
export function getDefaultSort(
  dataView: DataView | undefined,
  defaultSortOrder: string = 'desc',
  hidingTimeColumn: boolean = false
): SortOrder[] {
  if (
    dataView?.timeFieldName &&
    isSortable(dataView.timeFieldName, dataView) &&
    !hidingTimeColumn
  ) {
    return [[dataView.timeFieldName, defaultSortOrder]];
  } else {
    return [];
  }
}
