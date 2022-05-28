/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from './utils';
import { movingAverage, MovingAverageArgs } from '../moving_average';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types/specs/datatable';

const defaultArgs = { window: 5, inputColumnId: 'val', outputColumnId: 'output' };

describe('interpreter/functions#movingAverage', () => {
  const fn = functionWrapper(movingAverage);
  const runFn = (input: Datatable, args: MovingAverageArgs) =>
    fn(input, args, {} as ExecutionContext) as Promise<Datatable>;

  it('calculates movingAverage', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: 7 }, { val: 3 }, { val: 2 }],
      },
      defaultArgs
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      5,
      (5 + 7) / 2,
      (5 + 7 + 3) / 3,
    ]);
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
      defaultArgs
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
      1,
      undefined,
      undefined,
      (1 + 2) / 2,
      (1 + 2 + 4) / 3,
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
      { ...defaultArgs, window: 3 }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      1,
      (1 + 2) / 2,
      undefined,
      (1 + 2 + 0) / 3,
      undefined,
      (2 + 0 + 0) / 3,
      (0 + 0 + 0) / 3,
      (8 + 0 + 0) / 3,
    ]);
  });

  it('calculates movingAverage for multiple series', async () => {
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
      { ...defaultArgs, by: ['split'] }
    );

    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      2,
      1,
      (1 + 4) / 2,
      (1 + 4 + 5) / 3,
      (2 + 3) / 2,
      (2 + 3 + 7) / 3,
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
      { ...defaultArgs, by: ['split'] }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      undefined,
      1,
      3,
      (1 + 4) / 2,
      2,
      (2 + 7) / 2,
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
      { ...defaultArgs, by: ['split'] }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      undefined,
      1,
      3,
      (1 + 4) / 2,
      (3 + 5) / 2,
      2,
      (3 + 5 + 7) / 3,
    ]);
  });

  it('calculates movingAverage for multiple series by multiple split columns', async () => {
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
      { ...defaultArgs, by: ['split', 'split2'] }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      undefined,
      undefined,
      1,
      undefined,
      undefined,
      undefined,
      7,
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
      { ...defaultArgs, by: ['split'] }
    );

    expect(result.rows.map((row) => row.output)).toEqual([undefined, 1, undefined, 10]);
  });

  it('casts values to number before calculating movingAverage', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: '3' }, { val: 2 }],
      },
      defaultArgs
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      5,
      (5 + 7) / 2,
      (5 + 7 + 3) / 3,
    ]);
  });

  it('skips NaN like values', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: {} }, { val: 3 }, { val: 5 }],
      },
      defaultArgs
    );
    expect(result.rows.map((row) => row.output)).toEqual([undefined, 5, (5 + 7) / 2, NaN, NaN]);
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
      defaultArgs
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
      { ...defaultArgs, outputColumnName: 'Output name' }
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
      await runFn(input, { ...defaultArgs, inputColumnId: 'nonexisting', outputColumnId: 'output' })
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
        { ...defaultArgs, inputColumnId: 'val', outputColumnId: 'val' }
      )
    ).rejects.toBeDefined();
  });

  it('calculates moving average for window equal to 1', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [
          { val: 5 },
          { val: '7' },
          { val: 0 },
          { val: 3 },
          { val: -10 },
          { val: 2 },
          { val: 8 },
          { val: undefined },
          { val: null },
          { val: 5 },
        ],
      },
      { inputColumnId: 'val', outputColumnId: 'output', window: 1 }
    );
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      5,
      7,
      0,
      3,
      -10,
      2,
      undefined,
      undefined,
      8,
    ]);
  });

  it('calculates moving average for window bigger than array', async () => {
    const result = await runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 1 }, { val: 2 }, { val: 0 }, { val: 5 }, { val: {} }, { val: {} }],
      },
      { inputColumnId: 'val', outputColumnId: 'output', window: 15 }
    );
    expect(result.columns).toContainEqual({
      id: 'output',
      name: 'output',
      meta: { type: 'number' },
    });
    expect(result.rows.map((row) => row.output)).toEqual([
      undefined,
      1,
      (1 + 2) / 2,
      (1 + 2 + 0) / 3,
      (1 + 2 + 0 + 5) / 4,
      NaN,
    ]);
  });
});
