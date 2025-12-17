/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DimensionType } from '@kbn/expressions-plugin/common';
import { prepareLogTable } from './prepare_log_table';

describe('prepareLogTable', () => {
  test('returns first matching dimension name', () => {
    const datatable = {
      columns: [
        {
          meta: {},
        },
        {
          meta: {},
        },
        {
          id: 'd3',
          meta: {},
        },
      ],
    };
    const logTable = prepareLogTable(datatable as any, [
      [[{ accessor: 0 } as any], 'dimension1'],
      [[{ accessor: { id: 'd3' } } as any], 'dimension3'],
      [[{ accessor: 1 } as any], 'dimension2'],
    ]);
    expect(logTable).toMatchInlineSnapshot(
      {
        columns: [
          {
            meta: {
              dimensionName: 'dimension1',
            },
          },
          {
            meta: {
              dimensionName: 'dimension2',
            },
          },
          {
            id: 'd3',
            meta: {
              dimensionName: 'dimension3',
            },
          },
        ],
      },
      `
      Object {
        "columns": Array [
          Object {
            "meta": Object {
              "dimensionName": "dimension1",
            },
          },
          Object {
            "meta": Object {
              "dimensionName": "dimension2",
            },
          },
          Object {
            "id": "d3",
            "meta": Object {
              "dimensionName": "dimension3",
            },
          },
        ],
      }
    `
    );
  });
  test('returns passed dimension types', () => {
    const datatable = {
      columns: [
        {
          meta: {},
        },
        {
          meta: {},
        },
        {
          id: 'd3',
          meta: {},
        },
      ],
    };
    const logTable = prepareLogTable(datatable as any, [
      [[{ accessor: 0 } as any], 'dimension1', DimensionType.Y_AXIS],
      [[{ accessor: { id: 'd3' } } as any], 'dimension3', DimensionType.X_AXIS],
      [[{ accessor: 1 } as any], 'dimension2', DimensionType.BREAKDOWN],
    ]);
    expect(logTable).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "meta": Object {
              "dimensionName": "dimension1",
              "dimensionType": "y",
            },
          },
          Object {
            "meta": Object {
              "dimensionName": "dimension2",
              "dimensionType": "breakdown",
            },
          },
          Object {
            "id": "d3",
            "meta": Object {
              "dimensionName": "dimension3",
              "dimensionType": "x",
            },
          },
        ],
      }
    `);
  });
});
