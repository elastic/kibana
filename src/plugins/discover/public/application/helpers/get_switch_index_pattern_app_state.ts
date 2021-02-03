/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getSortArray } from '../angular/doc_table';
import { SortPairArr } from '../angular/doc_table/lib/get_sort';
import { IndexPattern } from '../../kibana_services';

/**
 * Helper function to remove or adapt the currently selected columns/sort to be valid with the next
 * index pattern, returns a new state object
 */
export function getSwitchIndexPatternAppState(
  currentIndexPattern: IndexPattern,
  nextIndexPattern: IndexPattern,
  currentColumns: string[],
  currentSort: SortPairArr[],
  modifyColumns: boolean = true,
  useNewFieldsApi: boolean = false
) {
  const nextColumns = modifyColumns
    ? currentColumns.filter(
        (column) =>
          nextIndexPattern.fields.getByName(column) || !currentIndexPattern.fields.getByName(column)
      )
    : currentColumns;
  const nextSort = getSortArray(currentSort, nextIndexPattern);
  const defaultColumns = useNewFieldsApi ? [] : ['_source'];
  const columns = nextColumns.length ? nextColumns : defaultColumns;
  return {
    index: nextIndexPattern.id,
    columns,
    sort: nextSort,
  };
}
