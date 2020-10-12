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
import { cumulativeSum } from '../cumulative_sum';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types/specs/datatable';

describe('interpreter/functions#cumulative_sum', () => {
  const fn = functionWrapper(cumulativeSum);
  const runFn = (input: Datatable, args: { by?: string[]; column: string }) =>
    fn(input, args, {} as ExecutionContext);

  it('calculates cumulative sum', () => {
    expect(
      runFn(
        {
          type: 'datatable',
          columns: [{ id: 'val', name: 'val', meta: { type: 'number' } }],
          rows: [{ val: 5 }, { val: 7 }, { val: 3 }, { val: 2 }],
        },
        { column: 'val' }
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
        ],
        "rows": Array [
          Object {
            "val": 5,
          },
          Object {
            "val": 12,
          },
          Object {
            "val": 15,
          },
          Object {
            "val": 17,
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
        { column: 'val', by: ['split'] }
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
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "split": "A",
            "val": 1,
          },
          Object {
            "split": "B",
            "val": 2,
          },
          Object {
            "split": "B",
            "val": 5,
          },
          Object {
            "split": "A",
            "val": 5,
          },
          Object {
            "split": "A",
            "val": 10,
          },
          Object {
            "split": "A",
            "val": 16,
          },
          Object {
            "split": "B",
            "val": 12,
          },
          Object {
            "split": "B",
            "val": 20,
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
        { column: 'val', by: ['split'] }
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
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "split": "A",
            "val": 1,
          },
          Object {
            "split": "B",
            "val": 2,
          },
          Object {
            "val": 3,
          },
          Object {
            "split": "A",
            "val": 5,
          },
          Object {
            "val": 8,
          },
          Object {
            "split": "A",
            "val": 11,
          },
          Object {
            "split": "B",
            "val": 9,
          },
          Object {
            "split": "B",
            "val": 17,
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
        { column: 'val', by: ['split'] }
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
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "split": "A",
            "val": 1,
          },
          Object {
            "split": "B",
            "val": 2,
          },
          Object {
            "val": 3,
          },
          Object {
            "split": "A",
            "val": 5,
          },
          Object {
            "val": 8,
          },
          Object {
            "split": "A",
            "val": 11,
          },
          Object {
            "split": null,
            "val": 15,
          },
          Object {
            "split": "B",
            "val": 10,
          },
          Object {
            "split": "",
            "val": 24,
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
        { column: 'val', by: ['split', 'split2'] }
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
            "split": "A",
            "split2": "C",
            "val": 1,
          },
          Object {
            "split": "B",
            "split2": "C",
            "val": 2,
          },
          Object {
            "split2": "C",
            "val": 3,
          },
          Object {
            "split": "A",
            "split2": "C",
            "val": 5,
          },
          Object {
            "val": 5,
          },
          Object {
            "split": "A",
            "split2": "D",
            "val": 6,
          },
          Object {
            "split": "B",
            "split2": "D",
            "val": 7,
          },
          Object {
            "split": "B",
            "split2": "D",
            "val": 15,
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
        { column: 'val', by: ['split'] }
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
            "id": "split",
            "meta": Object {
              "type": "string",
            },
            "name": "split",
          },
        ],
        "rows": Array [
          Object {
            "split": Object {
              "anObj": 3,
            },
            "val": 1,
          },
          Object {
            "split": Object {
              "anotherObj": 5,
            },
            "val": 3,
          },
          Object {
            "split": 5,
            "val": 3,
          },
          Object {
            "split": "5",
            "val": 7,
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
        { column: 'val' }
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
        ],
        "rows": Array [
          Object {
            "val": 5,
          },
          Object {
            "val": 12,
          },
          Object {
            "val": 15,
          },
          Object {
            "val": 17,
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
        { column: 'val' }
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
        ],
        "rows": Array [
          Object {
            "val": 5,
          },
          Object {
            "val": 12,
          },
          Object {
            "val": NaN,
          },
          Object {
            "val": NaN,
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
        { column: 'val' }
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
        ],
        "rows": Array [
          Object {
            "val": 0,
          },
          Object {
            "val": 7,
          },
          Object {
            "val": 7,
          },
          Object {
            "val": 7,
          },
          Object {
            "val": 7,
          },
          Object {
            "val": 7,
          },
          Object {
            "val": 10,
          },
          Object {
            "val": 12,
          },
          Object {
            "val": 12,
          },
        ],
        "type": "datatable",
      }
    `);
  });
});
