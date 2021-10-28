/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexPattern } from 'src/plugins/data/common';
import { getSortArray, SortPairArr } from '../components/doc_table/lib/get_sort';

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
  sortDirection: string = 'desc'
) {
  const nextColumns = modifyColumns
    ? currentColumns.filter(
        (column) =>
          nextIndexPattern.fields.getByName(column) || !currentIndexPattern.fields.getByName(column)
      )
    : currentColumns;
  const columns = nextColumns.length ? nextColumns : [];
  // when switching from an index pattern with timeField to an index pattern without timeField
  // filter out sorting by timeField in case it is set. index patterns without timeField don't
  // prepend this field in the table, so in legacy grid you would need to add this column to
  // remove sorting
  const nextSort = getSortArray(currentSort, nextIndexPattern).filter((value) => {
    return nextIndexPattern.timeFieldName || value[0] !== currentIndexPattern.timeFieldName;
  });
  return {
    index: nextIndexPattern.id,
    columns,
    sort:
      nextIndexPattern.timeFieldName && !nextSort.length
        ? [[nextIndexPattern.timeFieldName, sortDirection]]
        : nextSort,
  };
}
