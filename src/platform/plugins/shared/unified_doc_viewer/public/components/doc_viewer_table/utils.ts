/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldRow } from './field_row';

export function getCellPositionAfterPinToggle({
  field,
  pinnedRows,
  restRows,
}: {
  field: string;
  pinnedRows: FieldRow[];
  restRows: FieldRow[];
}) {
  const allPinnedFields = pinnedRows.map((row) => row.name);

  if (!allPinnedFields.includes(field)) {
    const newPinnedSorted = [...allPinnedFields, field].sort((a, b) => a.localeCompare(b));
    const newPinnedIndex = newPinnedSorted.indexOf(field);
    return newPinnedIndex;
  }

  const nonPinnedFields = [...restRows.map((row) => row.name), field];
  const nonPinnedSorted = nonPinnedFields.sort((a, b) => a.localeCompare(b));
  const newNonPinnedIndex = nonPinnedSorted.indexOf(field) + (pinnedRows.length - 1);
  return newNonPinnedIndex;
}
