/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';

/**
 * Replaces columns in savedSearch with variable-driven columns when they exist in ESQL variables
 * and the original columns are not present in the current request.
 */
export const replaceColumnsWithVariableDriven = (
  savedSearchColumns: string[] | undefined,
  esqlDataView: DataView | undefined,
  esqlVariables: ESQLControlVariable[] | undefined,
  isEsql: boolean
): string[] => {
  if (!isEsql || !esqlDataView) {
    return savedSearchColumns ?? [];
  }

  const columnsFromRequest = esqlDataView.fields.map((field) => field.name);
  const columnDrivenByVariable = esqlDataView.fields.find((field) => {
    // check if the field name exists in the esqlVariables value property
    return esqlVariables?.some((esqlVar) => esqlVar.value === field.name);
  });

  if (!columnDrivenByVariable) {
    return savedSearchColumns ?? [];
  }

  // find the savedSearch.columns which doesn't exist in columnsFromRequest and replace it with the columnDrivenByVariable
  const variableDrivenColumnName = columnDrivenByVariable.name;
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
