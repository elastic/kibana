/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildResultColumns, Datatable } from '..';

describe('buildResultColumns', () => {
  function getDatatable(columns: Datatable['columns']): Datatable {
    const row: Datatable['rows'][number] = {};
    for (const { id, meta } of columns) {
      row[id] = meta.type === 'number' ? 5 : 'a';
    }
    return {
      type: 'datatable',
      columns,
      rows: Array(5).fill(row),
    };
  }
  it('should append the new output column', () => {
    const newColumns = buildResultColumns(
      getDatatable([{ id: 'inputId', name: 'value', meta: { type: 'number' } }]),
      'outputId',
      'inputId',
      undefined
    );
    expect(newColumns).not.toBeUndefined();
    expect(newColumns).toHaveLength(2);
    expect(newColumns![1]).toEqual({ id: 'outputId', name: 'outputId', meta: { type: 'number' } });
  });

  it('should create a new column with the passed name', () => {
    const newColumns = buildResultColumns(
      getDatatable([{ id: 'inputId', name: 'value', meta: { type: 'number' } }]),
      'outputId',
      'inputId',
      'newName'
    );
    expect(newColumns![1]).toEqual({ id: 'outputId', name: 'newName', meta: { type: 'number' } });
  });

  it('should throw if same id is passed for input and output', () => {
    expect(() =>
      buildResultColumns(
        getDatatable([{ id: 'inputId', name: 'value', meta: { type: 'number' } }]),
        'inputId',
        'inputId',
        undefined
      )
    ).toThrow();
  });

  it('should overwrite column with the correct flag', () => {
    const newColumns = buildResultColumns(
      getDatatable([{ id: 'inputId', name: 'value', meta: { type: 'number' } }]),
      'inputId',
      'inputId',
      undefined,
      { allowColumnOverwrite: true }
    );
    expect(newColumns).toHaveLength(1);
  });
});
