/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';

export function canPrependTimeFieldColumn(
  columns: string[] | undefined,
  timeFieldName: string | undefined,
  dataView: DataView,
  showTimeCol: boolean, // based on Advanced Settings `doc_table:hideTimeColumn`
  isESQLMode: boolean
) {
  if (!showTimeCol || !timeFieldName) {
    return false;
  }

  if (isESQLMode) {
    // In ES|QL mode, check if the time field exists in the DataView fields
    // (the DataView should be enriched with ES|QL columns)
    return !!columns && !!dataView.getFieldByName(timeFieldName) && columns.includes('_source');
  }

  return true;
}

export function getVisibleColumns(
  columns: string[],
  dataView: DataView,
  shouldPrependTimeFieldColumn: boolean
) {
  const timeFieldName = dataView.timeFieldName;

  if (
    shouldPrependTimeFieldColumn &&
    timeFieldName &&
    !columns.find((col) => col === timeFieldName)
  ) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
