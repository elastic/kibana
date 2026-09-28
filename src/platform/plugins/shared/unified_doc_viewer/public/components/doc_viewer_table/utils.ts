/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldRow } from './field_row';

const getFieldSortName = (row: FieldRow) => row.dataViewField?.displayName ?? row.name;

const sortRowsByDisplayName = (rows: FieldRow[]) =>
  rows.sort((rowA, rowB) => getFieldSortName(rowA).localeCompare(getFieldSortName(rowB)));

export function getCellPositionAfterPinToggle({
  field,
  pinnedRows,
  restRows,
}: {
  field: string;
  pinnedRows: FieldRow[];
  restRows: FieldRow[];
}) {
  const fieldRow = [...pinnedRows, ...restRows].find((row) => row.name === field);

  if (!fieldRow) {
    return -1;
  }

  if (!pinnedRows.includes(fieldRow)) {
    const newPinnedRows = sortRowsByDisplayName([...pinnedRows, fieldRow]);
    return newPinnedRows.indexOf(fieldRow);
  }

  const newNonPinnedRows = sortRowsByDisplayName([...restRows, fieldRow]);
  const newNonPinnedIndex = newNonPinnedRows.indexOf(fieldRow) + (pinnedRows.length - 1);
  return newNonPinnedIndex;
}
