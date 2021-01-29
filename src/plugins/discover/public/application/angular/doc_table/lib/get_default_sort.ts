/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPattern } from '../../../../kibana_services';
import { isSortable } from './get_sort';
import { SortOrder } from '../components/table_header/helpers';

/**
 * use in case the user didn't manually sort.
 * the default sort is returned depending of the index pattern
 */
export function getDefaultSort(
  indexPattern: IndexPattern | undefined,
  defaultSortOrder: string = 'desc'
): SortOrder[] {
  if (indexPattern?.timeFieldName && isSortable(indexPattern.timeFieldName, indexPattern)) {
    return [[indexPattern.timeFieldName, defaultSortOrder]];
  } else {
    return [];
  }
}
