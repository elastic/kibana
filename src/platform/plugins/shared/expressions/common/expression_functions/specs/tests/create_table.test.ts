/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { createTable } from '../create_table';

describe('clear', () => {
  const fn = functionWrapper(createTable);

  it('returns a blank table', () => {
    expect(fn(null, {})).toEqual({
      type: 'datatable',
      columns: [],
      rows: [{}],
    });
  });

  it('creates a table with default names', () => {
    expect(
      fn(null, {
        ids: ['a', 'b'],
        rowCount: 3,
      })
    ).toEqual({
      type: 'datatable',
      columns: [
        { id: 'a', name: 'a', meta: { type: 'null' } },
        { id: 'b', name: 'b', meta: { type: 'null' } },
      ],
      rows: [{}, {}, {}],
    });
  });

  it('create a table with names that match by position', () => {
    expect(
      fn(null, {
        ids: ['a', 'b'],
        names: ['name'],
      })
    ).toEqual({
      type: 'datatable',
      columns: [
        { id: 'a', name: 'name', meta: { type: 'null' } },
        { id: 'b', name: 'b', meta: { type: 'null' } },
      ],
      rows: [{}],
    });
  });

  it('does provides unique objects for each row', () => {
    const table = fn(null, {
      ids: ['a', 'b'],
      rowCount: 2,
    });

    table.rows[0].a = 'z';
    table.rows[1].b = 5;

    expect(table.rows).toEqual([{ a: 'z' }, { b: 5 }]);
  });
});
