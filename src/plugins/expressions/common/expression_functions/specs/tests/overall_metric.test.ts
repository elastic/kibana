/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from './utils';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types/specs/datatable';
import { overallMetric, OverallMetricArgs } from '../overall_metric';

describe('interpreter/functions#overall_metric', () => {
  const fn = functionWrapper(overallMetric);
  const runFn = (input: Datatable, args: OverallMetricArgs) =>
    fn(input, args, {} as ExecutionContext) as Promise<Datatable>;

  it('ignores null or undefined with sum', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: undefined }, { val: 7 }, { val: 3 }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'sum' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([12, 12, 12, 12]);
  });

  it('ignores null or undefined with average', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{}, { val: null }, { val: undefined }, { val: 1 }, { val: 5 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'average' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([3, 3, 3, 3, 3]);
  });

  it('ignores null or undefined with min', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{}, { val: null }, { val: undefined }, { val: 1 }, { val: 5 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'min' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([1, 1, 1, 1, 1]);
  });

  it('ignores null or undefined with max', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{}, { val: null }, { val: undefined }, { val: -1 }, { val: -5 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'max' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([-1, -1, -1, -1, -1]);
  });

  it('calculates overall sum for multiple series', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [
          { id: 'val', name: 'val', meta: { type: 'number' } },
          { id: 'split', name: 'split', meta: { type: 'string' } },
        ],
        rows: [
          { val: 1, split: 'A' },
          { val: 2, split: 'B' },
          { val: 3, split: 'B' },
          { val: 4, split: 'A' },
          { val: 5, split: 'A' },
          { val: 6, split: 'A' },
          { val: 7, split: 'B' },
          { val: 8, split: 'B' },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split'], metric: 'sum' }
    );

    expect(result.rows.map((row) => row.output)).toEqual([
      1 + 4 + 5 + 6,
      2 + 3 + 7 + 8,
      2 + 3 + 7 + 8,
      1 + 4 + 5 + 6,
      1 + 4 + 5 + 6,
      1 + 4 + 5 + 6,
      2 + 3 + 7 + 8,
      2 + 3 + 7 + 8,
    ]);
  });

  it('treats missing split column as separate series', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [
          { id: 'val', name: 'val', meta: { type: 'number' } },
          { id: 'split', name: 'split', meta: { type: 'string' } },
        ],
        rows: [
          { val: 1, split: 'A' },
          { val: 2, split: 'B' },
          { val: 3 },
          { val: 4, split: 'A' },
          { val: 5 },
          { val: 6, split: 'A' },
          { val: 7, split: 'B' },
          { val: 8, split: 'B' },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split'], metric: 'min' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([1, 2, 3, 1, 3, 1, 2, 2]);
  });

  it('treats null like undefined and empty string for split columns', async () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'val', name: 'val', meta: { type: 'number' } },
        { id: 'split', name: 'split', meta: { type: 'string' } },
      ],
      rows: [
        { val: 1, split: 'A' },
        { val: 2, split: 'B' },
        { val: 3 },
        { val: 4, split: 'A' },
        { val: 5 },
        { val: 6, split: 'A' },
        { val: 7, split: null },
        { val: 8, split: 'B' },
        { val: 9, split: '' },
      ],
    };

    const result = await runFn(table, {
      inputColumnId: 'val',
      outputColumnId: 'output',
      by: ['split'],
      metric: 'sum',
    });
    expect(result.rows.map((row) => row.output)).toEqual([
      1 + 4 + 6,
      2 + 8,
      3 + 5 + 7 + 9,
      1 + 4 + 6,
      3 + 5 + 7 + 9,
      1 + 4 + 6,
      3 + 5 + 7 + 9,
      2 + 8,
      3 + 5 + 7 + 9,
    ]);

    const result2 = await runFn(table, {
      inputColumnId: 'val',
      outputColumnId: 'output',
      by: ['split'],
      metric: 'max',
    });
    expect(result2.rows.map((row) => row.output)).toEqual([6, 8, 9, 6, 9, 6, 9, 8, 9]);

    const result3 = await runFn(table, {
      inputColumnId: 'val',
      outputColumnId: 'output',
      by: ['split'],
      metric: 'average',
    });
    expect(result3.rows.map((row) => row.output)).toEqual([
      (1 + 4 + 6) / 3,
      (2 + 8) / 2,
      (3 + 5 + 7 + 9) / 4,
      (1 + 4 + 6) / 3,
      (3 + 5 + 7 + 9) / 4,
      (1 + 4 + 6) / 3,
      (3 + 5 + 7 + 9) / 4,
      (2 + 8) / 2,
      (3 + 5 + 7 + 9) / 4,
    ]);
  });

  it('handles array values', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: [7, 10] }, { val: [3, 1] }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'sum' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([28, 28, 28, 28]);
  });

  it('takes array values into account for average calculation', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: [3, 4] }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'average' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([3, 3]);
  });

  it('handles array values for split columns', async () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'val', name: 'val', meta: { type: 'number' } },
        { id: 'split', name: 'split', meta: { type: 'string' } },
      ],
      rows: [
        { val: 1, split: 'A' },
        { val: [2, 11], split: 'B' },
        { val: 3 },
        { val: 4, split: 'A' },
        { val: 5 },
        { val: 6, split: 'A' },
        { val: 7, split: null },
        { val: 8, split: 'B' },
        { val: [9, 99], split: '' },
      ],
    };

    const result = await runFn(table, {
      inputColumnId: 'val',
      outputColumnId: 'output',
      by: ['split'],
      metric: 'sum',
    });
    expect(result.rows.map((row) => row.output)).toEqual([
      1 + 4 + 6,
      2 + 11 + 8,
      3 + 5 + 7 + 9 + 99,
      1 + 4 + 6,
      3 + 5 + 7 + 9 + 99,
      1 + 4 + 6,
      3 + 5 + 7 + 9 + 99,
      2 + 11 + 8,
      3 + 5 + 7 + 9 + 99,
    ]);

    const result2 = await runFn(table, {
      inputColumnId: 'val',
      outputColumnId: 'output',
      by: ['split'],
      metric: 'max',
    });
    expect(result2.rows.map((row) => row.output)).toEqual([6, 11, 99, 6, 99, 6, 99, 11, 99]);
  });

  it('calculates cumulative sum for multiple series by multiple split columns', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [
          { id: 'val', name: 'val', meta: { type: 'number' } },
          { id: 'split', name: 'split', meta: { type: 'string' } },
          { id: 'split2', name: 'split2', meta: { type: 'string' } },
        ],
        rows: [
          { val: 1, split: 'A', split2: 'C' },
          { val: 2, split: 'B', split2: 'C' },
          { val: 3, split2: 'C' },
          { val: 4, split: 'A', split2: 'C' },
          { val: 5 },
          { val: 6, split: 'A', split2: 'D' },
          { val: 7, split: 'B', split2: 'D' },
          { val: 8, split: 'B', split2: 'D' },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split', 'split2'], metric: 'sum' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([1 + 4, 2, 3, 1 + 4, 5, 6, 7 + 8, 7 + 8]);
  });

  it('splits separate series by the string representation of the cell values', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [
          { id: 'val', name: 'val', meta: { type: 'number' } },
          { id: 'split', name: 'split', meta: { type: 'string' } },
        ],
        rows: [
          { val: 1, split: { anObj: 3 } },
          { val: 2, split: { anotherObj: 5 } },
          { val: 10, split: 5 },
          { val: 11, split: '5' },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split'], metric: 'sum' }
    );

    expect(result.rows.map((row) => row.output)).toEqual([1 + 2, 1 + 2, 10 + 11, 10 + 11]);
  });

  it('casts values to number before calculating cumulative sum', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: '3' }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'max' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([7, 7, 7, 7]);
  });

  it('casts values to number before calculating metric for NaN like values', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: {} }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'min' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([NaN, NaN, NaN, NaN]);
  });

  it('skips undefined and null values', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [
          { val: null },
          { val: 7 },
          { val: undefined },
          { val: undefined },
          { val: undefined },
          { val: undefined },
          { val: '3' },
          { val: 2 },
          { val: null },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'average' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it('copies over meta information from the source column', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [
          {
            id: 'val',
            name: 'val',
            meta: {
              type: 'number',

              field: 'afield',
              index: 'anindex',
              params: { id: 'number', params: { pattern: '000' } },
              source: 'synthetic',
              sourceParams: {
                some: 'params',
              },
            },
          },
        ],
        rows: [{ val: 5 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', metric: 'sum' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: {
        type: 'number',

        field: 'afield',
        index: 'anindex',
        params: { id: 'number', params: { pattern: '000' } },
        source: 'synthetic',
        sourceParams: {
          some: 'params',
        },
      },
    });
  });

  it('sets output name on output column if specified', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [
          {
            id: 'val',
            name: 'val',
            meta: {
              type: 'number',
            },
          },
        ],
        rows: [{ val: 5 }],
      },
      {
        inputColumnId: 'val',
        outputColumnId: 'output',
        outputColumnName: 'Output name',
        metric: 'min',
      }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'Output name',
      meta: { type: 'number' },
    });
  });

  it('returns source table if input column does not exist', async () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: 'val',
          name: 'val',
          meta: {
            type: 'number',
          },
        },
      ],
      rows: [{ val: 5 }],
    };
    expect(
      await runFn(input, { inputColumnId: 'nonexisting', outputColumnId: 'output', metric: 'sum' })
    ).toBe(input);
  });

  it('throws an error if output column exists already', async () => {
    await expect(
      runFn(
        {
          type: 'datatable',
          columns: [
            {
              id: 'val',
              name: 'val',
              meta: {
                type: 'number',
              },
            },
          ],
          rows: [{ val: 5 }],
        },
        { inputColumnId: 'val', outputColumnId: 'val', metric: 'max' }
      )
    ).rejects.toBeDefined();
  });
});
