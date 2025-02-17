/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridSorting } from '@elastic/eui';
import { EuiDataGridColumnSortingConfig } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { useCallback, useMemo, useState } from 'react';
import { defaultSort } from '../constants';

const formatGridColumns = (cols: SortCombinations[]): EuiDataGridSorting['columns'] => {
  const colsSorting: EuiDataGridSorting['columns'] = [];
  cols.forEach((col) => {
    Object.entries(col).forEach(([field, oSort]) => {
      colsSorting.push({ id: field, direction: oSort.order });
    });
  });
  return colsSorting;
};

export type UseSorting = (
  onSortChange: (sort: EuiDataGridSorting['columns']) => void,
  initialSort: SortCombinations[]
) => {
  sortingColumns: EuiDataGridSorting['columns'];
  onSort: (newSort: EuiDataGridSorting['columns']) => void;
};

export function useSorting(
  onSortChange: (sort: EuiDataGridSorting['columns']) => void,
  visibleColumns: string[],
  initialSort: SortCombinations[] = defaultSort
) {
  const [visibleColumnsSort, invisibleColumnsSort] = useMemo(() => {
    const visibleSort: SortCombinations[] = [];
    const invisibleSort: EuiDataGridColumnSortingConfig[] = [];
    initialSort.forEach((sortCombinations) => {
      if (visibleColumns.includes(Object.keys(sortCombinations)[0])) {
        visibleSort.push(sortCombinations);
      } else {
        invisibleSort.push(...formatGridColumns([sortCombinations]));
      }
    });
    return [visibleSort, invisibleSort];
  }, [initialSort, visibleColumns]);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>(
    formatGridColumns(visibleColumnsSort)
  );
  const onSort = useCallback<EuiDataGridSorting['onSort']>(
    (sortingConfig) => {
      onSortChange([...sortingConfig, ...invisibleColumnsSort]);
      setSortingColumns(sortingConfig);
    },
    [onSortChange, invisibleColumnsSort]
  );
  return { sortingColumns, onSort };
}
