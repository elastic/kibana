/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function canPrependTimeFieldColumn(
  columns: string[] | undefined,
  timeFieldName: string | undefined,
  hasTimeFieldInResult: boolean,
  showTimeCol: boolean, // based on Advanced Settings `doc_table:hideTimeColumn`
  isESQLMode: boolean
) {
  if (!showTimeCol || !timeFieldName) {
    return false;
  }

  if (isESQLMode) {
    return !!columns && hasTimeFieldInResult;
  }

  return true;
}

export function getVisibleColumns(
  columns: string[],
  timeFieldName: string | undefined,
  shouldPrependTimeFieldColumn: boolean
) {
  if (
    shouldPrependTimeFieldColumn &&
    timeFieldName &&
    !columns.find((col) => col === timeFieldName)
  ) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
