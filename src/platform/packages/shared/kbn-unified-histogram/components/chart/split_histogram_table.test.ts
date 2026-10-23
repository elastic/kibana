/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { getHistogramBucket, splitHistogramTable } from './split_histogram_table';

const table = {
  type: 'datatable',
  columns: [
    {
      id: 'timestamp',
      name: 'timestamp',
      meta: { type: 'date', esMeta: { bucket: { interval: 30, unit: 'minute' } } },
    },
    { id: 'results', name: 'results', meta: { type: 'number' } },
  ],
  rows: [
    { timestamp: 1, results: 10 },
    { timestamp: 2, results: 4 },
  ],
} as Datatable;

const splitParams = {
  table,
  timeColumn: 'timestamp',
  label: 'Failed login',
  remainderLabel: 'Other documents',
};

describe('getHistogramBucket', () => {
  it('reads the time column and raw ES|QL bucket interval', () => {
    expect(getHistogramBucket(table)).toEqual({ timeColumn: 'timestamp', interval: '30 minute' });
  });

  it('rejects a unit that is not a plain ES|QL time unit', () => {
    expect(
      getHistogramBucket({
        ...table,
        columns: [
          {
            id: 'timestamp',
            name: 'timestamp',
            meta: { type: 'date', esMeta: { bucket: { interval: 30, unit: 'minute) | DROP x' } } },
          },
        ],
      })
    ).toBeUndefined();
  });

  it('returns undefined without bucket metadata', () => {
    expect(
      getHistogramBucket({
        ...table,
        columns: [{ id: 'timestamp', name: 'timestamp', meta: { type: 'date' } }],
      })
    ).toBeUndefined();
  });
});

describe('splitHistogramTable', () => {
  it('joins counts onto the loaded rows and stacks the selection first', () => {
    const split = splitHistogramTable({ ...splitParams, counts: [{ timestamp: 1, count: 3 }] });

    expect(split?.approximate).toBe(false);
    expect(split?.table.rows).toEqual([
      { timestamp: 1, results: 10, overlay: 3, remainder: 7 },
      { timestamp: 2, results: 4, overlay: 0, remainder: 4 },
    ]);
    expect(split?.table.columns.map(({ id, name }) => [id, name])).toEqual([
      ['timestamp', 'timestamp'],
      ['results', 'results'],
      ['overlay', 'Failed login'],
      ['remainder', 'Other documents'],
    ]);
  });

  it('matches buckets when the counts and the histogram format timestamps differently', () => {
    const bucket = Date.parse('2026-10-19T18:00:00.000Z');
    const split = splitHistogramTable({
      ...splitParams,
      table: { ...table, rows: [{ timestamp: bucket, results: 10 }] },
      counts: [{ timestamp: '2026-10-19T18:00:00.000Z', count: 3 }],
    });

    expect(split?.table.rows).toEqual([
      { timestamp: bucket, results: 10, overlay: 3, remainder: 7 },
    ]);
  });

  it('clips a count above the bucket total and marks the result approximate', () => {
    const split = splitHistogramTable({ ...splitParams, counts: [{ timestamp: 2, count: 9 }] });

    expect(split?.table.rows[1]).toEqual({ timestamp: 2, results: 4, overlay: 4, remainder: 0 });
    expect(split?.approximate).toBe(true);
  });
});
