/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getESQLBreakdownSortCommands } from './get_esql_breakdown_sort';

const stringColumn: DatatableColumn = {
  id: 'log.level',
  name: 'log.level',
  meta: { type: 'string' },
};

const numberColumn: DatatableColumn = {
  id: 'status',
  name: 'status',
  meta: { type: 'number' },
};

describe('getESQLBreakdownSortCommands', () => {
  it('sorts alphabetically when no value order is given', () => {
    expect(getESQLBreakdownSortCommands(stringColumn, undefined)).toBe(' | sort `log.level` asc');
    expect(getESQLBreakdownSortCommands(stringColumn, [])).toBe(' | sort `log.level` asc');
  });

  it('ranks the listed values first and the remaining values alphabetically', () => {
    expect(getESQLBreakdownSortCommands(stringColumn, ['error', 'info'])).toBe(
      ' | EVAL __unifiedHistogramSortIndex = CASE(`log.level` == "error", 0, `log.level` == "info", 1, 2)' +
        ' | SORT __unifiedHistogramSortIndex ASC, `log.level` ASC' +
        ' | DROP __unifiedHistogramSortIndex'
    );
  });

  it('escapes string values', () => {
    expect(getESQLBreakdownSortCommands(stringColumn, ['say "hi"'])).toContain(
      '`log.level` == "say \\"hi\\"", 0'
    );
  });

  it('renders numeric values unquoted and drops values of the wrong type', () => {
    expect(getESQLBreakdownSortCommands(numberColumn, [500, 'error', 200])).toBe(
      ' | EVAL __unifiedHistogramSortIndex = CASE(`status` == 500, 0, `status` == 200, 1, 2)' +
        ' | SORT __unifiedHistogramSortIndex ASC, `status` ASC' +
        ' | DROP __unifiedHistogramSortIndex'
    );
    expect(getESQLBreakdownSortCommands(stringColumn, [500])).toBe(' | sort `log.level` asc');
  });
});
