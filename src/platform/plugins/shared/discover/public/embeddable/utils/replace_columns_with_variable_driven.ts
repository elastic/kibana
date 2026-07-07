/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';

/**
 * Replaces columns in savedSearch with variable-driven columns when they exist in ESQL variables
 * and the original columns are not present in the current request.
 */
export const replaceColumnsWithVariableDriven = (
  savedSearchColumns: string[] | undefined,
  columnsMeta: Record<string, DatatableColumnMeta> | undefined,
  esqlVariables: ESQLControlVariable[] | undefined,
  isEsql: boolean
): string[] => {
  if (!isEsql || !columnsMeta) {
    return savedSearchColumns ?? [];
  }

  const columnsFromRequest = Object.keys(columnsMeta);
  const columnDrivenByVariable = Object.entries(columnsMeta).find(([id, meta]) => {
    // check if the id exists in the esqlVariables value property
    return esqlVariables?.some((esqlVar) => esqlVar.value === id);
  });

  if (!columnDrivenByVariable) {
    return savedSearchColumns ?? [];
  }

  // find the savedSearch.columns which doesn't exist in columnsFromRequest and replace it with the columnDrivenByVariable
  const variableDrivenColumnName = columnDrivenByVariable[0];
  const updatedColumns = (savedSearchColumns ?? []).map((columnName) => {
    // If this column from savedSearch doesn't exist in the current request columns,
    // replace it with the variable-driven column
    if (!columnsFromRequest.includes(columnName)) {
      return variableDrivenColumnName;
    }
    return columnName;
  });

  // Remove duplicates and return
  return Array.from(new Set(updatedColumns));
};
