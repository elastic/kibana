/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from 'src/plugins/data_views/public';
import { isSortable } from './get_sort';
import { SortOrder } from '../components/table_header/helpers';

/**
 * use in case the user didn't manually sort.
 * the default sort is returned depending of the index pattern
 */
export function getDefaultSort(
  indexPattern: DataView | undefined,
  defaultSortOrder: string = 'desc',
  hidingTimeColumn: boolean
): SortOrder[] {
  if (
    indexPattern?.timeFieldName &&
    isSortable(indexPattern.timeFieldName, indexPattern) &&
    !hidingTimeColumn
  ) {
    return [[indexPattern.timeFieldName, defaultSortOrder]];
  } else {
    return [];
  }
}
