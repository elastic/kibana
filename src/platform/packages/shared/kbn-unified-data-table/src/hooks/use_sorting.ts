/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getSortingCriteria } from '@kbn/sort-predicates';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import { useMemo } from 'react';
import type { EuiDataGridColumnSortingConfig, EuiDataGridProps } from '@elastic/eui';
import type { SortOrder } from '../components/data_table';
import type { DataTableColumnsMeta } from '../types';

export const useSorting = ({
  rows,
  visibleColumns,
  columnsMeta,
  sort,
  dataView,
  isPlainRecord,
  isSortEnabled,
  defaultColumns,
  onSort,
}: {
  rows: DataTableRecord[] | undefined;
  visibleColumns: string[];
  columnsMeta: DataTableColumnsMeta | undefined;
  sort: SortOrder[];
  dataView: DataView;
  isPlainRecord: boolean;
  isSortEnabled: boolean;
  defaultColumns: boolean;
  onSort: ((sort: string[][]) => void) | undefined;
}) => {
  const sortingColumns = useMemo(() => {
    return sort
      .map(([id, direction]) => ({ id, direction }))
      .filter((col) => visibleColumns.includes(col.id)) as EuiDataGridColumnSortingConfig[];
  }, [sort, visibleColumns]);

  const comparators = useMemo(() => {
    if (!isPlainRecord || !rows || !sortingColumns.length) {
      return;
    }

    return sortingColumns.reduce<Array<(a: DataTableRecord, b: DataTableRecord) => number>>(
      (acc, { id, direction }) => {
        const field = getDataViewFieldOrCreateFromColumnMeta({
          dataView,
          fieldName: id,
          columnMeta: columnsMeta?.[id],
        });

        if (!field) {
          return acc;
        }

        const sortField = getSortingCriteria(field.type, id, dataView.getFormatterForField(field));

        acc.push((a, b) => sortField(a.flattened, b.flattened, direction as 'asc' | 'desc'));

        return acc;
      },
      []
    );
  }, [columnsMeta, dataView, isPlainRecord, rows, sortingColumns]);

  const sortedRows = useMemo(() => {
    if (!rows || !comparators) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      for (const comparator of comparators) {
        const result = comparator(a, b);

        if (result !== 0) {
          return result;
        }
      }

      return 0;
    });
  }, [comparators, rows]);

  const sorting = useMemo<EuiDataGridProps['sorting']>(() => {
    if (!isSortEnabled) {
      return {
        columns: sortingColumns,
        onSort: () => {},
      };
    }

    // in ES|QL mode, sorting is disabled when in Document view
    // ideally we want the @timestamp column to be sortable server side
    // but it needs discussion before moving forward like this
    if (isPlainRecord && defaultColumns) {
      return undefined;
    }

    return {
      columns: sortingColumns,
      onSort: (sortingColumnsData) => {
        onSort?.(sortingColumnsData.map(({ id, direction }) => [id, direction]));
      },
    };
  }, [isSortEnabled, isPlainRecord, defaultColumns, sortingColumns, onSort]);

  return { sortedRows, sorting };
};
