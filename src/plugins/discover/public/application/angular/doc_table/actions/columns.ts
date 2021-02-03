/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
