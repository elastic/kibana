/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from './utils';
import { cumulativeSum, CumulativeSumArgs } from '../cumulative_sum';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types/specs/datatable';

describe('interpreter/functions#cumulative_sum', () => {
  const fn = functionWrapper(cumulativeSum);
  const runFn = (input: Datatable, args: CumulativeSumArgs) =>
    fn(input, args, {} as ExecutionContext) as Promise<Datatable>;

  it('calculates cumulative sum', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: 7 }, { val: 3 }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([5, 12, 15, 17]);
  });

  it('replaces null or undefined data with zeroes until there is real data', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{}, { val: null }, { val: undefined }, { val: 1 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([0, 0, 0, 1]);
  });

  it('calculates cumulative sum for multiple series', async () => {
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
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split'] }
    );

    expect(result.rows.map((row) => row.output)).toEqual([
      1,
      2,
      2 + 3,
      1 + 4,
      1 + 4 + 5,
      1 + 4 + 5 + 6,
      2 + 3 + 7,
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
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split'] }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      1,
      2,
      3,
      1 + 4,
      3 + 5,
      1 + 4 + 6,
      2 + 7,
      2 + 7 + 8,
    ]);
  });

  it('treats null like undefined and empty string for split columns', async () => {
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
          { val: 7, split: null },
          { val: 8, split: 'B' },
          { val: 9, split: '' },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split'] }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      1,
      2,
      3,
      1 + 4,
      3 + 5,
      1 + 4 + 6,
      3 + 5 + 7,
      2 + 8,
      3 + 5 + 7 + 9,
    ]);
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
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split', 'split2'] }
    );
    expect(result.rows.map((row) => row.output)).toEqual([1, 2, 3, 1 + 4, 5, 6, 7, 7 + 8]);
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
      { inputColumnId: 'val', outputColumnId: 'output', by: ['split'] }
    );

    expect(result.rows.map((row) => row.output)).toEqual([1, 1 + 2, 10, 21]);
  });

  it('casts values to number before calculating cumulative sum', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: '3' }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([5, 12, 15, 17]);
  });

  it('casts values to number before calculating cumulative sum for NaN like values', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: {} }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([5, 12, NaN, NaN]);
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
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([0, 7, 7, 7, 7, 7, 10, 12, 12]);
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
      { inputColumnId: 'val', outputColumnId: 'output' }
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
      { inputColumnId: 'val', outputColumnId: 'output', outputColumnName: 'Output name' }
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
    expect(await runFn(input, { inputColumnId: 'nonexisting', outputColumnId: 'output' })).toBe(
      input
    );
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
        { inputColumnId: 'val', outputColumnId: 'val' }
      )
    ).rejects.toBeDefined();
  });
});
