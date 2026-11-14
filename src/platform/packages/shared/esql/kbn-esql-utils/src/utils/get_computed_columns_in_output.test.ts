/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getComputedColumnsInOutput } from './get_computed_columns_in_output';

const getColumns = (query: string) => [...getComputedColumnsInOutput(query)].sort();

describe('getComputedColumnsInOutput', () => {
  it('returns the columns created by EVAL', () => {
    expect(getColumns('FROM logs | EVAL a = bytes * 2, b = "x"')).toEqual(['a', 'b']);
  });

  it('returns no columns for a query without computed ones', () => {
    expect(getColumns('FROM logs | WHERE bytes > 1 | LIMIT 10')).toEqual([]);
  });

  it('keeps an EVAL column that is used as a STATS grouping', () => {
    expect(
      getColumns(
        'FROM logs | EVAL size = CASE(bytes > 1, "big", "small") | STATS c = COUNT(*) BY size'
      )
    ).toEqual(['c', 'size']);
  });

  it('drops the EVAL columns that STATS does not output', () => {
    expect(getColumns('FROM logs | EVAL a = bytes * 2 | STATS c = COUNT(*)')).toEqual(['c']);
  });

  it('keeps the columns created after STATS, and the ones it groups by', () => {
    expect(getColumns('FROM logs | STATS c = COUNT(*) BY host | EVAL ratio = c / 2')).toEqual([
      'c',
      'host',
      'ratio',
    ]);
  });

  it('removes the columns discarded by DROP and KEEP', () => {
    expect(getColumns('FROM logs | EVAL a = 1, b = 2 | DROP a')).toEqual(['b']);
    expect(getColumns('FROM logs | EVAL a = 1, b = 2 | KEEP bytes, b')).toEqual(['b']);
  });

  it('does not discard columns on KEEP with wildcards', () => {
    expect(getColumns('FROM logs | EVAL a = 1, b = 2 | KEEP a*')).toEqual(['a', 'b']);
  });

  it('follows RENAME', () => {
    expect(getColumns('FROM logs | EVAL a = 1 | RENAME a AS b')).toEqual(['b']);
  });
});
