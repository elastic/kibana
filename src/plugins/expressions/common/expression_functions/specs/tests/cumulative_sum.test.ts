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
import { cumulativeSum, CumulativeSumArgs } from '../cumulative_sum';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types/specs/datatable';

describe('interpreter/functions#cumulative_sum', () => {
  const fn = functionWrapper(cumulativeSum);
  const runFn = (input: Datatable, args: CumulativeSumArgs) =>
    fn(input, args, {} as ExecutionContext);

  it('calculates cumulative sum', () => {
    expect(
      runFn(
        {
          type: 'datatable',
          columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
          rows: [{ val: 5 }, { val: 7 }, { val: 3 }, { val: 2 }],
        },
        { inputColumnId: 'val', outputColumnId: 'output' }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
        ],
        "rows": Array [
          Object {
            "output": 5,
            "val": 5,
          },
          Object {
            "output": 12,
            "val": 7,
          },
          Object {
            "output": 10,
            "val": 3,
          },
          Object {
            "output": 5,
            "val": 2,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('calculates cumulative sum for multiple series', () => {
    expect(
      runFn(
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
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
          Object {
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "output": 1,
            "split": "A",
            "val": 1,
          },
          Object {
            "output": 2,
            "split": "B",
            "val": 2,
          },
          Object {
            "output": 5,
            "split": "B",
            "val": 3,
          },
          Object {
            "output": 5,
            "split": "A",
            "val": 4,
          },
          Object {
            "output": 9,
            "split": "A",
            "val": 5,
          },
          Object {
            "output": 11,
            "split": "A",
            "val": 6,
          },
          Object {
            "output": 10,
            "split": "B",
            "val": 7,
          },
          Object {
            "output": 15,
            "split": "B",
            "val": 8,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('treats missing split column as separate series', () => {
    expect(
      runFn(
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
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
          Object {
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "output": 1,
            "split": "A",
            "val": 1,
          },
          Object {
            "output": 2,
            "split": "B",
            "val": 2,
          },
          Object {
            "output": 3,
            "val": 3,
          },
          Object {
            "output": 5,
            "split": "A",
            "val": 4,
          },
          Object {
            "output": 8,
            "val": 5,
          },
          Object {
            "output": 10,
            "split": "A",
            "val": 6,
          },
          Object {
            "output": 9,
            "split": "B",
            "val": 7,
          },
          Object {
            "output": 15,
            "split": "B",
            "val": 8,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('treats null like undefined and empty string for split columns', () => {
    expect(
      runFn(
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
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
          Object {
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "output": 1,
            "split": "A",
            "val": 1,
          },
          Object {
            "output": 2,
            "split": "B",
            "val": 2,
          },
          Object {
            "output": 3,
            "val": 3,
          },
          Object {
            "output": 5,
            "split": "A",
            "val": 4,
          },
          Object {
            "output": 8,
            "val": 5,
          },
          Object {
            "output": 10,
            "split": "A",
            "val": 6,
          },
          Object {
            "output": 12,
            "split": null,
            "val": 7,
          },
          Object {
            "output": 10,
            "split": "B",
            "val": 8,
          },
          Object {
            "output": 16,
            "split": "",
            "val": 9,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('calculates cumulative sum for multiple series by multiple split columns', () => {
    expect(
      runFn(
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
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
          Object {
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
          Object {
            "id": "split2",
            "meta": Object {
              "type": "string",
            },
            "name": "split2",
          },
        ],
        "rows": Array [
          Object {
            "output": 1,
            "split": "A",
            "split2": "C",
            "val": 1,
          },
          Object {
            "output": 2,
            "split": "B",
            "split2": "C",
            "val": 2,
          },
          Object {
            "output": 3,
            "split2": "C",
            "val": 3,
          },
          Object {
            "output": 5,
            "split": "A",
            "split2": "C",
            "val": 4,
          },
          Object {
            "output": 5,
            "val": 5,
          },
          Object {
            "output": 6,
            "split": "A",
            "split2": "D",
            "val": 6,
          },
          Object {
            "output": 7,
            "split": "B",
            "split2": "D",
            "val": 7,
          },
          Object {
            "output": 15,
            "split": "B",
            "split2": "D",
            "val": 8,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('splits separate series by the string representation of the cell values', () => {
    expect(
      runFn(
        {
          type: 'datatable',
          columns: [
            { id: 'val', name: 'val', meta: { type: 'number' } },
            { id: 'split', name: 'split', meta: { type: 'string' } },
          ],
          rows: [
            { val: 1, split: { anObj: 3 } },
            { val: 2, split: { anotherObj: 5 } },
            { val: 3, split: 5 },
            { val: 4, split: '5' },
          ],
        },
        { inputColumnId: 'val', outputColumnId: 'output', by: ['split'] }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
          Object {
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "output": 1,
            "split": Object {
              "anObj": 3,
            },
            "val": 1,
          },
          Object {
            "output": 3,
            "split": Object {
              "anotherObj": 5,
            },
            "val": 2,
          },
          Object {
            "output": 3,
            "split": 5,
            "val": 3,
          },
          Object {
            "output": 7,
            "split": "5",
            "val": 4,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('casts values to number before calculating cumulative sum', () => {
    expect(
      runFn(
        {
          type: 'datatable',
          columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
          rows: [{ val: 5 }, { val: '7' }, { val: '3' }, { val: 2 }],
        },
        { inputColumnId: 'val', outputColumnId: 'output' }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
        ],
        "rows": Array [
          Object {
            "output": 5,
            "val": 5,
          },
          Object {
            "output": 12,
            "val": "7",
          },
          Object {
            "output": "37",
            "val": "3",
          },
          Object {
            "output": "23",
            "val": 2,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('casts values to number before calculating cumulative sum for NaN like values', () => {
    expect(
      runFn(
        {
          type: 'datatable',
          columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
          rows: [{ val: 5 }, { val: '7' }, { val: {} }, { val: 2 }],
        },
        { inputColumnId: 'val', outputColumnId: 'output' }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
        ],
        "rows": Array [
          Object {
            "output": 5,
            "val": 5,
          },
          Object {
            "output": 12,
            "val": "7",
          },
          Object {
            "output": "NaN7",
            "val": Object {},
          },
          Object {
            "output": "2[object Object]",
            "val": 2,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('skips undefined and null values', () => {
    expect(
      runFn(
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
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "output",
          },
        ],
        "rows": Array [
          Object {
            "output": 0,
            "val": null,
          },
          Object {
            "output": 7,
            "val": 7,
          },
          Object {
            "output": 7,
            "val": undefined,
          },
          Object {
            "output": 7,
            "val": undefined,
          },
          Object {
            "output": 7,
            "val": undefined,
          },
          Object {
            "output": 7,
            "val": undefined,
          },
          Object {
            "output": 10,
            "val": "3",
          },
          Object {
            "output": "23",
            "val": 2,
          },
          Object {
            "output": 2,
            "val": null,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('copies over meta information from the source column', () => {
    expect(
      runFn(
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
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "field": "afield",
              "index": "anindex",
              "params": Object {
                "id": "number",
                "params": Object {
                  "pattern": "000",
                },
              },
              "source": "synthetic",
              "sourceParams": Object {
                "some": "params",
              },
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "field": "afield",
              "index": "anindex",
              "params": Object {
                "id": "number",
                "params": Object {
                  "pattern": "000",
                },
              },
              "source": "synthetic",
              "sourceParams": Object {
                "some": "params",
              },
              "type": "number",
            },
            "name": "output",
          },
        ],
        "rows": Array [
          Object {
            "output": 5,
            "val": 5,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('sets output name on output column if specified', () => {
    expect(
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
        { inputColumnId: 'val', outputColumnId: 'output', outputColumnName: 'Output name' }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "val",
            "meta": Object {
              "type": "number",
            },
            "name": "val",
          },
          Object {
            "id": "output",
            "meta": Object {
              "type": "number",
            },
            "name": "Output name",
          },
        ],
        "rows": Array [
          Object {
            "output": 5,
            "val": 5,
          },
        ],
        "type": "datatable",
      }
    `);
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
    expect(runFn(input, { inputColumnId: 'nonexisting', outputColumnId: 'output' })).toBe(input);
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
        { inputColumnId: 'val', outputColumnId: 'val' }
      )
    ).toThrow();
  });
});
