/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
});
