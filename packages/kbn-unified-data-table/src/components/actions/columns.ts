/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Capabilities } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { popularizeField } from '../../utils/popularize_field';

/**
 * Helper function to provide a fallback to a single _source column if the given array of columns
 * is empty, and removes _source if there are more than 1 columns given
 * @param columns
 * @param useNewFieldsApi should a new fields API be used
 */
function buildColumns(columns: string[], useNewFieldsApi = false) {
  if (columns.length > 1 && columns.indexOf('_source') !== -1) {
    return columns.filter((col) => col !== '_source');
  } else if (columns.length !== 0) {
    return columns;
  }
  return useNewFieldsApi ? [] : ['_source'];
}

export function addColumn(columns: string[], columnName: string, useNewFieldsApi?: boolean) {
  if (columns.includes(columnName)) {
    return columns;
  }
  return buildColumns([...columns, columnName], useNewFieldsApi);
}

export function removeColumn(columns: string[], columnName: string, useNewFieldsApi?: boolean) {
  if (!columns.includes(columnName)) {
    return columns;
  }
  return buildColumns(
    columns.filter((col) => col !== columnName),
    useNewFieldsApi
  );
}

export function moveColumn(columns: string[], columnName: string, newIndex: number) {
  if (newIndex < 0 || newIndex >= columns.length || !columns.includes(columnName)) {
    return columns;
  }
  const modifiedColumns = [...columns];
  modifiedColumns.splice(modifiedColumns.indexOf(columnName), 1); // remove at old index
  modifiedColumns.splice(newIndex, 0, columnName); // insert before new index
  return modifiedColumns;
}

export function getStateColumnActions({
  capabilities,
  dataView,
  dataViews,
  useNewFieldsApi,
  setAppState,
  columns,
  sort,
  defaultOrder,
}: {
  capabilities: Capabilities;
  dataView: DataView;
  dataViews: DataViewsContract;
  useNewFieldsApi: boolean;
  setAppState: (state: { columns: string[]; sort?: string[][] }) => void;
  columns?: string[];
  sort: string[][] | undefined;
  defaultOrder: string;
}) {
  function onAddColumn(columnName: string) {
    popularizeField(dataView, columnName, dataViews, capabilities);
    const nextColumns = addColumn(columns || [], columnName, useNewFieldsApi);
    const nextSort = columnName === '_score' && !sort?.length ? [['_score', defaultOrder]] : sort;
    setAppState({ columns: nextColumns, sort: nextSort });
  }

  function onRemoveColumn(columnName: string) {
    popularizeField(dataView, columnName, dataViews, capabilities);
    const nextColumns = removeColumn(columns || [], columnName, useNewFieldsApi);
    // The state's sort property is an array of [sortByColumn,sortDirection]
    const nextSort = sort && sort.length ? sort.filter((subArr) => subArr[0] !== columnName) : [];
    setAppState({ columns: nextColumns, sort: nextSort });
  }

  function onMoveColumn(columnName: string, newIndex: number) {
    const nextColumns = moveColumn(columns || [], columnName, newIndex);
    setAppState({ columns: nextColumns });
  }

  function onSetColumns(nextColumns: string[], hideTimeColumn: boolean) {
    // The next line should be gone when classic table will be removed
    const actualColumns =
      !hideTimeColumn && dataView.timeFieldName && dataView.timeFieldName === nextColumns[0]
        ? (nextColumns || []).slice(1)
        : nextColumns;

    setAppState({ columns: actualColumns });
  }
  return {
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
}
