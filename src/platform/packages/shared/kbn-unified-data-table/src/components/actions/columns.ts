/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { omit } from 'lodash';
import { popularizeField } from '../../utils/popularize_field';
import type { UnifiedDataTableSettings } from '../../types';

export function getStateColumnActions({
  capabilities,
  dataView,
  dataViews,
  setAppState,
  columns,
  sort,
  defaultOrder,
  settings,
}: {
  capabilities: Capabilities;
  dataView: DataView;
  dataViews: DataViewsContract;
  setAppState: (state: {
    columns: string[];
    sort?: string[][];
    settings?: UnifiedDataTableSettings;
  }) => void;
  columns?: string[];
  sort: string[][] | undefined;
  defaultOrder: string;
  settings?: UnifiedDataTableSettings;
}) {
  function onAddColumn(columnName: string) {
    popularizeField(dataView, columnName, dataViews, capabilities);
    const nextColumns = addColumn(columns || [], columnName);
    const nextSort = columnName === '_score' && !sort?.length ? [['_score', defaultOrder]] : sort;
    setAppState({ columns: nextColumns, sort: nextSort, settings });
  }

  function onRemoveColumn(columnName: string) {
    popularizeField(dataView, columnName, dataViews, capabilities);

    const nextColumns = removeColumn(columns || [], columnName);
    // The state's sort property is an array of [sortByColumn,sortDirection]
    const nextSort = sort && sort.length ? sort.filter((subArr) => subArr[0] !== columnName) : [];

    let nextSettings = cleanColumnSettings(nextColumns, settings);

    // When columns are removed, reset the last column to auto width if only absolute
    // width columns remain, to ensure the columns fill the available grid space
    if (nextColumns.length < (columns?.length ?? 0)) {
      nextSettings = adjustLastColumnWidth(nextColumns, nextSettings);
    }

    setAppState({ columns: nextColumns, sort: nextSort, settings: nextSettings });
  }

  function onMoveColumn(columnName: string, newIndex: number) {
    const nextColumns = moveColumn(columns || [], columnName, newIndex);
    setAppState({ columns: nextColumns, settings });
  }

  function onSetColumns(nextColumns: string[], hideTimeColumn: boolean) {
    // The next line should be gone when classic table will be removed
    const actualColumns =
      !hideTimeColumn && dataView.timeFieldName && dataView.timeFieldName === nextColumns[0]
        ? (nextColumns || []).slice(1)
        : nextColumns;

    let nextSettings = cleanColumnSettings(nextColumns, settings);

    // When columns are removed, reset the last column to auto width if only absolute
    // width columns remain, to ensure the columns fill the available grid space
    if (actualColumns.length < (columns?.length ?? 0)) {
      nextSettings = adjustLastColumnWidth(actualColumns, nextSettings);
    }

    setAppState({ columns: actualColumns, settings: nextSettings });
  }
  return {
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
}

/**
 * Helper function to provide a fallback to a single _source column if the given array of columns
 * is empty, and removes _source if there are more than 1 columns given
 * @param columns
 */
function buildColumns(columns: string[]) {
  if (columns.length > 1 && columns.indexOf('_source') !== -1) {
    return columns.filter((col) => col !== '_source');
  } else if (columns.length !== 0) {
    return columns;
  }
  return [];
}

function addColumn(columns: string[], columnName: string) {
  if (columns.includes(columnName)) {
    return columns;
  }
  return buildColumns([...columns, columnName]);
}

function removeColumn(columns: string[], columnName: string) {
  if (!columns.includes(columnName)) {
    return columns;
  }
  return buildColumns(columns.filter((col) => col !== columnName));
}

function moveColumn(columns: string[], columnName: string, newIndex: number) {
  if (newIndex < 0 || newIndex >= columns.length || !columns.includes(columnName)) {
    return columns;
  }
  const modifiedColumns = [...columns];
  modifiedColumns.splice(modifiedColumns.indexOf(columnName), 1); // remove at old index
  modifiedColumns.splice(newIndex, 0, columnName); // insert before new index
  return modifiedColumns;
}

function cleanColumnSettings(
  columns: string[],
  settings?: UnifiedDataTableSettings
): UnifiedDataTableSettings | undefined {
  const columnSettings = settings?.columns;

  if (!columnSettings) {
    return settings;
  }

  const nextColumnSettings = columns.reduce<NonNullable<UnifiedDataTableSettings['columns']>>(
    (acc, column) => (columnSettings[column] ? { ...acc, [column]: columnSettings[column] } : acc),
    {}
  );

  return { ...settings, columns: nextColumnSettings };
}

function adjustLastColumnWidth(
  columns: string[],
  settings?: UnifiedDataTableSettings
): UnifiedDataTableSettings | undefined {
  const columnSettings = settings?.columns;

  if (!columns.length || !columnSettings) {
    return settings;
  }

  const hasAutoWidthColumn = columns.some((colId) => columnSettings[colId]?.width == null);

  if (hasAutoWidthColumn) {
    return settings;
  }

  const lastColumn = columns[columns.length - 1];
  const lastColumnSettings = omit(columnSettings[lastColumn] ?? {}, 'width');
  const lastColumnSettingsOptional = Object.keys(lastColumnSettings).length
    ? { [lastColumn]: lastColumnSettings }
    : undefined;

  return {
    ...settings,
    columns: {
      ...omit(columnSettings, lastColumn),
      ...lastColumnSettingsOptional,
    },
  };
}
