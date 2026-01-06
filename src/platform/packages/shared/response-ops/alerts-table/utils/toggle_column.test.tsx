/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toggleColumn } from './toggle_column';

describe('toggleColumn', () => {
  const columns = [{ id: 'test-column' }];

  it('should remove a column if it is currently shown', async () => {
    expect(
      toggleColumn({
        columnId: 'test-column',
        columns,
        defaultColumns: [],
      })
    ).toHaveLength(0);
  });

  it('should add a column even if no column is currently shown', async () => {
    expect(
      toggleColumn({
        columnId: '_id',
        columns: [],
        defaultColumns: [],
      })
    ).toEqual([{ id: '_id' }]);
  });

  it('should toggle on a column in the same position as the default config', async () => {
    expect(
      toggleColumn({
        columnId: 'test-column',
        columns: [],
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      })
    ).toEqual([{ id: 'test-column' }]);

    expect(
      toggleColumn({
        columnId: 'last-column',
        columns: [{ id: 'another-column' }],
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      })
    ).toEqual([{ id: 'another-column' }, { id: 'last-column' }]);
  });

  it('should toggle on a column in the second position if not part of the default config', async () => {
    expect(
      toggleColumn({
        columnId: 'new-column',
        columns: [{ id: 'another-column' }],
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      })
    ).toEqual([{ id: 'another-column' }, { id: 'new-column' }]);

    expect(
      toggleColumn({
        columnId: 'new-column',
        columns: [{ id: 'first-column' }, { id: 'another-column' }],
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      })
    ).toEqual([{ id: 'first-column' }, { id: 'new-column' }, { id: 'another-column' }]);
  });
});

describe('toggleVisibleColumn', () => {
  const visibleColumns = ['test-column'];

  it('should remove a column if it is currently shown', async () => {
    expect(
      toggleColumn({
        columnId: 'test-column',
        columns: visibleColumns.map((id) => ({ id })),
        defaultColumns: [],
      }).map(({ id }) => id)
    ).toHaveLength(0);
  });

  it('should add a column even if no column is currently shown', async () => {
    expect(
      toggleColumn({
        columnId: '_id',
        columns: [],
        defaultColumns: [],
      }).map(({ id }) => id)
    ).toEqual(['_id']);
  });

  it('should toggle on a column in the same position as the default config', async () => {
    expect(
      toggleColumn({
        columnId: 'test-column',
        columns: [],
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      }).map(({ id }) => id)
    ).toEqual(['test-column']);

    expect(
      toggleColumn({
        columnId: 'last-column',
        columns: ['another-column'].map((id) => ({ id })),
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      }).map(({ id }) => id)
    ).toEqual(['another-column', 'last-column']);
  });

  it('should toggle on a column in the second position if not part of the default config', async () => {
    expect(
      toggleColumn({
        columnId: 'new-column',
        columns: ['another-column'].map((id) => ({ id })),
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      }).map(({ id }) => id)
    ).toEqual(['another-column', 'new-column']);

    expect(
      toggleColumn({
        columnId: 'new-column',
        columns: ['first-column', 'another-column'].map((id) => ({ id })),
        defaultColumns: [{ id: 'another-column' }, { id: 'test-column' }, { id: 'last-column' }],
      }).map(({ id }) => id)
    ).toEqual(['first-column', 'new-column', 'another-column']);
  });
});
