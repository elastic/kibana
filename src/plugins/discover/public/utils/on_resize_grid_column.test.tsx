/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { onResizeGridColumn } from './on_resize_grid_column';

describe('Discover onResizeGridColumn', () => {
  test('should handle empty initial value', () => {
    const newGrid = onResizeGridColumn(
      {
        columnId: 'test',
        width: 50,
      },
      undefined
    );

    expect(newGrid).toMatchInlineSnapshot(`
      Object {
        "columns": Object {
          "test": Object {
            "width": 50,
          },
        },
      }
    `);
  });

  test('should set rounded width to state on resize column', () => {
    const grid = { columns: { timestamp: { width: 173 }, someField: { width: 197 } } };

    const newGrid = onResizeGridColumn(
      {
        columnId: 'someField',
        width: 205.5435345534,
      },
      grid
    );

    expect(newGrid).toMatchInlineSnapshot(`
      Object {
        "columns": Object {
          "someField": Object {
            "width": 206,
          },
          "timestamp": Object {
            "width": 173,
          },
        },
      }
    `);
  });
});
