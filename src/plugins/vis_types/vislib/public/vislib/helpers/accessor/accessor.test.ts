/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DatatableColumn } from '../../../../../../expressions';
import { getColumnByAccessor, getValueByAccessor, getNextToAccessorColumn } from '../accessor';

describe('getColumnByAccessor', () => {
  const columns = [
    { id: 'col-0-0', name: 'Col1' },
    { id: 'col-0-1', name: 'Col2' },
    { id: 'col-0-2', name: 'Col3' },
    { id: 'col-0-3', name: 'Col4' },
  ];

  it('should find column by number accessor', () => {
    const accessor = 2;
    const column = getColumnByAccessor(columns, accessor);
    expect(column).not.toBeUndefined();
    expect(column).not.toBeNull();
    expect(typeof column).toBe('object');
    expect(column.id).toBe('col-0-2');
  });

  it('should not find a column by the number accessor with wrong index ', () => {
    const accessor = columns.length;

    const column = getColumnByAccessor(columns, accessor);
    expect(column).toBeUndefined();
  });

  it('should find column by DatatableColumn accessor', () => {
    const accessor: DatatableColumn = {
      id: 'col-0-1',
      name: 'some accessor',
      meta: { type: 'string' },
    };

    const column = getColumnByAccessor(columns, accessor);
    expect(column).not.toBeUndefined();
    expect(column).not.toBeNull();
    expect(typeof column).toBe('object');
    expect(column.id).toBe(accessor.id);
  });

  it('should not find a column by the DatatableColumn accessor with wrong id', () => {
    const accessor: DatatableColumn = {
      id: 'col-1-1',
      name: 'some accessor',
      meta: { type: 'string' },
    };

    const column = getColumnByAccessor(columns, accessor);
    expect(column).toBeUndefined();
  });
});

describe('getValueByAccessor', () => {
  const columnId = 'col-0-1';
  const columnValue = 'Some value';
  const data = {
    'col-0-3': 'col03',
    [columnId]: columnValue,
    'col-0-2': 'col01',
    'col-0-4': 'col-0-4',
  };

  it('should find column value by number accessor', () => {
    const accessor = 1;

    const value = getValueByAccessor(data, accessor);
    expect(value).not.toBeUndefined();
    expect(value).not.toBeNull();
    expect(value).toBe(data[columnId]);
  });

  it('should not find a column value by the number accessor with wrong index ', () => {
    const accessor = Object.keys(data).length;

    const column = getValueByAccessor(data, accessor);
    expect(column).toBeUndefined();
  });

  it('should find column by DatatableColumn accessor', () => {
    const accessor: DatatableColumn = {
      id: columnId,
      name: 'some accessor',
      meta: { type: 'string' },
    };

    const value = getValueByAccessor(data, accessor);
    expect(value).not.toBeUndefined();
    expect(value).not.toBeNull();
    expect(value).toBe(columnValue);
  });

  it('should not find a column by the DatatableColumn accessor with wrong id', () => {
    const accessor: DatatableColumn = {
      id: `${columnId}-0`,
      name: 'some accessor',
      meta: { type: 'string' },
    };

    const value = getValueByAccessor(data, accessor);
    expect(value).toBeUndefined();
  });
});

describe('getNextToAccessorColumn', () => {
  const columns = [
    { id: 'col-0-0', name: 'Col1' },
    { id: 'col-0-1', name: 'Col2' },
    { id: 'col-0-2', name: 'Col3' },
    { id: 'col-0-3', name: 'Col4' },
  ];

  it('should find a column next to the column accessor is pointing (number)', () => {
    const accessor = 1;

    const column = getNextToAccessorColumn(columns, accessor);
    expect(column).not.toBeUndefined();
    expect(column).not.toBeNull();
    expect(typeof column).toBe('object');
    expect(column?.id).toBe('col-0-2');
  });

  it('should not find a column next to the last column, where the accessor is pointing (number)', () => {
    const accessor = Object.keys(columns).length - 1;

    const column = getNextToAccessorColumn(columns, accessor);
    expect(column).toBeUndefined();
  });

  it('should not find a column next to the non-existent column, where the accessor is pointing (number)', () => {
    const accessor = Object.keys(columns).length;

    const column = getNextToAccessorColumn(columns, accessor);
    expect(column).toBeUndefined();
  });

  it('should find a column next to the column accessor is pointing (DatatableColumn)', () => {
    const accessor: DatatableColumn = {
      id: 'col-0-2',
      name: 'some accessor',
      meta: { type: 'string' },
    };

    const column = getNextToAccessorColumn(columns, accessor);
    expect(column).not.toBeUndefined();
    expect(column).not.toBeNull();
    expect(typeof column).toBe('object');
    expect(column?.id).toBe('col-0-3');
  });

  it('should not find a column next to the last column, where the accessor is pointing (DatatableColumn)', () => {
    const accessor: DatatableColumn = {
      id: columns[Object.keys(columns).length - 1].id,
      name: '',
      meta: { type: 'string' },
    };

    const column = getNextToAccessorColumn(columns, accessor);
    expect(column).toBeUndefined();
  });

  it('should not find a column next to the non-existent column, where the accessor is pointing (DatatableColumn)', () => {
    const accessor: DatatableColumn = {
      id: 'undefined-accessor',
      name: '',
      meta: { type: 'string' },
    };

    const column = getNextToAccessorColumn(columns, accessor);
    expect(column).toBeUndefined();
  });
});
