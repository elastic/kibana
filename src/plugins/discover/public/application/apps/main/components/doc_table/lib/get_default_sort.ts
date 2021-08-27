/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPattern } from '../../../../../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { SortOrder } from '../components/table_header/helpers';
import { isSortable } from './get_sort';

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
