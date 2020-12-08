/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { functionWrapper } from './utils';
import { movingAverage, MovingAverageArgs } from '../moving_average';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types/specs/datatable';

const defaultArgs = { window: 5, inputColumnId: 'val', outputColumnId: 'output' };

describe('interpreter/functions#movingAverage', () => {
  const fn = functionWrapper(movingAverage);
  const runFn = (input: Datatable, args: MovingAverageArgs) =>
    fn(input, args, {} as ExecutionContext) as Datatable;

  it('calculates movingAverage', () => {
    const result = runFn(
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

  it('skips null or undefined values until there is real data', () => {
    const result = runFn(
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

  it('treats 0 as real data', () => {
    const result = runFn(
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

  it('calculates movingAverage for multiple series', () => {
    const result = runFn(
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

  it('treats missing split column as separate series', () => {
    const result = runFn(
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

  it('treats null like undefined and empty string for split columns', () => {
    const result = runFn(
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

  it('calculates movingAverage for multiple series by multiple split columns', () => {
    const result = runFn(
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

  it('splits separate series by the string representation of the cell values', () => {
    const result = runFn(
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

  it('casts values to number before calculating movingAverage', () => {
    const result = runFn(
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

  it('skips NaN like values', () => {
    const result = runFn(
      {
        type: 'datatable',
        columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
        rows: [{ val: 5 }, { val: '7' }, { val: {} }, { val: 3 }, { val: 5 }],
      },
      defaultArgs
    );
    expect(result.rows.map((row) => row.output)).toEqual([undefined, 5, (5 + 7) / 2, NaN, NaN]);
  });

  it('copies over meta information from the source column', () => {
    const result = runFn(
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

  it('sets output name on output column if specified', () => {
    const result = runFn(
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

  it('returns source table if input column does not exist', () => {
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
      runFn(input, { ...defaultArgs, inputColumnId: 'nonexisting', outputColumnId: 'output' })
    ).toBe(input);
  });

  it('throws an error if output column exists already', () => {
    expect(() =>
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
    ).toThrow();
  });

  it('calculates moving average for window equal to 1', () => {
    const result = runFn(
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

  it('calculates moving average for window bigger than array', () => {
    const result = runFn(
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
