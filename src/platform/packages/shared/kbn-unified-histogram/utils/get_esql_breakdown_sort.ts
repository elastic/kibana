/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeStringValue } from '@kbn/esql-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';

export const ESQL_BREAKDOWN_SORT_INDEX_COLUMN = '__unifiedHistogramSortIndex';

/**
 * Builds the ES|QL commands that order the histogram rows by the breakdown column: by the given
 * value order when one is provided (unlisted values follow, alphabetically), else alphabetically.
 */
export const getESQLBreakdownSortCommands = (
  breakdownColumn: DatatableColumn,
  valueOrder: Array<string | number> | undefined
): string => {
  const columnName = `\`${breakdownColumn.name}\``;
  const isNumeric = breakdownColumn.meta?.type === 'number';
  const literals = (valueOrder ?? [])
    .filter((value) => (isNumeric ? typeof value === 'number' : typeof value === 'string'))
    .map((value) => (typeof value === 'number' ? String(value) : escapeStringValue(value)));

  if (!literals.length) {
    return ` | sort ${columnName} asc`;
  }

  const caseBranches = literals.map((literal, index) => `${columnName} == ${literal}, ${index}`);

  return (
    ` | EVAL ${ESQL_BREAKDOWN_SORT_INDEX_COLUMN} = CASE(${caseBranches.join(', ')}, ${
      literals.length
    })` +
    ` | SORT ${ESQL_BREAKDOWN_SORT_INDEX_COLUMN} ASC, ${columnName} ASC` +
    ` | DROP ${ESQL_BREAKDOWN_SORT_INDEX_COLUMN}`
  );
};
