/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from './utils';
import { derivative, DerivativeArgs } from '../derivative';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types/specs/datatable';

describe('interpreter/functions#derivative', () => {
  const fn = functionWrapper(derivative);
  const runFn = (input: Datatable, args: DerivativeArgs) =>
    fn(input, args, {} as ExecutionContext) as Promise<Datatable>;

  it('calculates derivative', async () => {
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
    expect(result.rows.map((row) => row.output)).toEqual([undefined, 2, -4, -1]);
  });

  it('skips null or undefined values until there is real data', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [
          {},
          { val: null },
          { val: undefined },
          { val: 1 },
          { val: 2 },
          { val: undefined },
          { val: undefined },
          { val: 4 },
          { val: 8 },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      2 - 1,
      undefined,
      undefined,
      undefined,
      8 - 4,
    ]);
  });

  it('treats 0 as real data', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [
          {},
          { val: null },
          { val: undefined },
          { val: 1 },
          { val: 2 },
          { val: 0 },
          { val: undefined },
          { val: 0 },
          { val: undefined },
          { val: 0 },
          { val: 8 },
          { val: 0 },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      2 - 1,
      0 - 2,
      undefined,
      undefined,
      undefined,
      undefined,
      8 - 0,
      0 - 8,
    ]);
  });

  it('calculates derivative for multiple series', async () => {
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
      undefined,
      undefined,
      3 - 2,
      4 - 1,
      5 - 4,
      6 - 5,
      7 - 3,
      8 - 7,
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
      undefined,
      undefined,
      undefined,
      4 - 1,
      5 - 3,
      6 - 4,
      7 - 2,
      8 - 7,
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
      undefined,
      undefined,
      undefined,
      4 - 1,
      5 - 3,
      6 - 4,
      7 - 5,
      8 - 2,
      9 - 7,
    ]);
  });

  it('calculates derivative for multiple series by multiple split columns', async () => {
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
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      undefined,
      4 - 1,
      undefined,
      undefined,
      undefined,
      8 - 7,
    ]);
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

    expect(result.rows.map((row) => row.output)).toEqual([undefined, 2 - 1, undefined, 11 - 10]);
  });

  it('casts values to number before calculating derivative', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: '3' }, { val: 2 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([undefined, 7 - 5, 3 - 7, 2 - 3]);
  });

  it('casts values to number before calculating derivative for NaN like values', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: {} }, { val: 2 }, { val: 5 }],
      },
      { inputColumnId: 'val', outputColumnId: 'output' }
    );
    expect(result.rows.map((row) => row.output)).toEqual([undefined, 7 - 5, NaN, NaN, 5 - 2]);
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
