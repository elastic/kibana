/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridSorting } from '@elastic/eui';
import type { EuiDataGridColumnSortingConfig } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { useCallback, useMemo, useState } from 'react';
import type { AlertsTableSortCombinations } from '../types';
import { defaultSortCombinations } from '../constants';

const sortCombinationsToDataGridSort = (
  sortCombinations: AlertsTableSortCombinations[]
): EuiDataGridSorting['columns'] =>
  sortCombinations.flatMap((combination) =>
    Object.entries(combination).map(([id, options]) => ({
      id,
      direction: options.order,
    }))
  );

export function useSorting(
  onSortChange: (sort: EuiDataGridSorting['columns']) => void,
  visibleColumns: string[],
  sortCombinations: AlertsTableSortCombinations[] = defaultSortCombinations
) {
  const [visibleColumnsSort, invisibleColumnsSort] = useMemo(() => {
    const visibleSort: AlertsTableSortCombinations[] = [];
    const invisibleSort: EuiDataGridColumnSortingConfig[] = [];
    sortCombinations.forEach((combination) => {
      if (visibleColumns.includes(Object.keys(combination)[0])) {
        visibleSort.push(combination);
      } else {
        invisibleSort.push(...sortCombinationsToDataGridSort([combination]));
      }
    });
    return [visibleSort, invisibleSort];
  }, [sortCombinations, visibleColumns]);

  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>(
    sortCombinationsToDataGridSort(visibleColumnsSort)
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
