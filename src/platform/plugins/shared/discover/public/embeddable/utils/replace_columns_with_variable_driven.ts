/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataSource, EsqlSource } from '@kbn/data-source';
import type { ESQLControlVariable } from '@kbn/esql-types';

/**
 * Replaces columns in savedSearch with variable-driven columns when they exist in ESQL variables
 * and the original columns are not present in the current request.
 */
export const replaceColumnsWithVariableDriven = (
  savedSearchColumns: string[] | undefined,
  dataSource: DataSource | undefined,
  esqlVariables: ESQLControlVariable[] | undefined,
  isEsql: boolean
): string[] => {
  if (!isEsql || !(dataSource instanceof EsqlSource)) {
    return savedSearchColumns ?? [];
  }

  const columnsFromRequest = dataSource.getColumns().map((c) => c.name);
  const variableDrivenColumnName = columnsFromRequest.find((id) =>
    esqlVariables?.some((esqlVar) => esqlVar.value === id)
  );

  if (!variableDrivenColumnName) {
    return savedSearchColumns ?? [];
  }

  const requestColumnSet = new Set(columnsFromRequest);
  const updatedColumns = (savedSearchColumns ?? []).map((columnName) =>
    requestColumnSet.has(columnName) ? columnName : variableDrivenColumnName
  );

  return Array.from(new Set(updatedColumns));
};
