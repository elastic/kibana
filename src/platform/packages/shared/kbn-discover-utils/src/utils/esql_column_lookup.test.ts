/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import type { DataTableColumnsMeta } from '../types';
import { dataViewMock } from '../__mocks__';
import { getEsqlColumnLookup, toDataTableColumnsMeta } from './esql_column_lookup';

const esqlSource = createMockEsqlSource([
  { name: 'bytes', type: 'number', esType: 'long', source: 'index' },
  { name: 'total', type: 'number', esType: 'double', source: 'esql-result' },
]);
const dataViewSource = new DataViewSource(dataViewMock);
const columnsMeta: DataTableColumnsMeta = {
  message: { type: 'string', esType: 'keyword', isComputedColumn: true },
};

describe('getEsqlColumnLookup', () => {
  it('returns the ES|QL source itself', () => {
    expect(getEsqlColumnLookup({ dataSource: esqlSource, columnsMeta })).toBe(esqlSource);
  });

  it('adapts the deprecated columnsMeta when there is no ES|QL source', () => {
    const lookup = getEsqlColumnLookup({ dataSource: dataViewSource, columnsMeta });

    expect(lookup?.getColumns()).toEqual([
      { name: 'message', type: 'string', esType: 'keyword', source: 'esql-result' },
    ]);
    expect(lookup?.getColumn('message')?.source).toBe('esql-result');
    expect(lookup?.getColumn('missing')).toBeUndefined();
  });

  it('returns undefined for a data view source without columnsMeta', () => {
    expect(getEsqlColumnLookup({ dataSource: dataViewSource })).toBeUndefined();
  });
});

describe('toDataTableColumnsMeta', () => {
  it('builds columnsMeta from the ES|QL source', () => {
    expect(toDataTableColumnsMeta({ dataSource: esqlSource, columnsMeta })).toEqual({
      bytes: { type: 'number', esType: 'long', isComputedColumn: false },
      total: { type: 'number', esType: 'double', isComputedColumn: true },
    });
  });

  it('passes the given columnsMeta through when there is no ES|QL source', () => {
    expect(toDataTableColumnsMeta({ dataSource: dataViewSource, columnsMeta })).toBe(columnsMeta);
    expect(toDataTableColumnsMeta({})).toBeUndefined();
  });
});
