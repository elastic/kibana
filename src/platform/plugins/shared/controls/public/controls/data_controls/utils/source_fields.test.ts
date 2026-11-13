/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import {
  asDataView,
  getFieldByName,
  getFieldFormatter,
  getFieldSpec,
  getRuntimeFieldMap,
} from './source_fields';

const host: FilterableField = { name: 'host', type: 'string', aggregatable: true };

// What `EsqlSource.toFilterableSource()` returns: plain fields, and none of the data view capabilities.
const esqlSource: FilterableSource = {
  kind: 'esql',
  id: 'esql-dataset-id',
  title: 'logs-*',
  fields: [host],
  isTimeBased: () => true,
};

// The capabilities of a `DataView` that controls read when they are there.
const dataViewLike = {
  id: 'data-view-id',
  title: 'logs-*',
  fields: [],
  isTimeBased: () => true,
  getFieldByName: jest.fn(() => host),
  getFormatterForField: jest.fn(() => ({ convertToText: (value: unknown) => `<${value}>` })),
  toSpec: jest.fn(() => ({ runtimeFieldMap: { day: { type: 'keyword' } } })),
} as unknown as FilterableSource;

describe('source fields', () => {
  it('finds a field of a source that is only a list of fields', () => {
    expect(getFieldByName(esqlSource, 'host')).toBe(host);
    expect(getFieldByName(esqlSource, 'missing')).toBeUndefined();
  });

  it('asks a data view for its field, which it looks up by name', () => {
    expect(getFieldByName(dataViewLike, 'host')).toBe(host);
    expect(dataViewLike.fields).toEqual([]);
  });

  it('uses the field itself as its spec when it has none', () => {
    expect(getFieldSpec(host)).toBe(host);
    expect(getFieldSpec({ ...host, toSpec: () => ({ name: 'spec' } as never) })).toEqual({
      name: 'spec',
    });
  });

  it('has no formatter nor runtime fields for a source that does not provide them', () => {
    expect(getFieldFormatter(esqlSource, host)).toBeUndefined();
    expect(getRuntimeFieldMap(esqlSource)).toBeUndefined();
  });

  it('formats with the formatter of a data view and reads its runtime fields', () => {
    expect(getFieldFormatter(dataViewLike, host)?.('a')).toBe('<a>');
    expect(getRuntimeFieldMap(dataViewLike)).toEqual({ day: { type: 'keyword' } });
  });

  it('does not take the source of an ES|QL dataset for a data view', () => {
    expect(asDataView(esqlSource)).toBeUndefined();
    expect(asDataView(dataViewLike)).toBe(dataViewLike);
  });
});
