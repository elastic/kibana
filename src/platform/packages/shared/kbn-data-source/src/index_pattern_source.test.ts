/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { IndexPatternSource } from './index_pattern_source';

interface MockField {
  name: string;
  type: string;
  esTypes?: string[];
}

function makeDataViewMock(
  overrides: {
    id?: string | undefined;
    name?: string;
    indexPattern?: string;
    timeFieldName?: string | undefined;
    fields?: MockField[];
    persisted?: boolean;
  } = {}
): DataView {
  const fields = overrides.fields ?? [];
  return {
    id: 'id' in overrides ? overrides.id : 'dv-id',
    timeFieldName: overrides.timeFieldName,
    getName: jest.fn(() => overrides.name ?? 'My Data View'),
    getIndexPattern: jest.fn(() => overrides.indexPattern ?? 'logs-*'),
    isPersisted: jest.fn(() => overrides.persisted ?? true),
    fields: {
      getAll: jest.fn(() => fields),
      getByName: jest.fn((n: string) => fields.find((f) => f.name === n)),
    },
  } as unknown as DataView;
}

describe('IndexPatternSource', () => {
  it('throws when constructed with a DataView that has no id', () => {
    const dv = makeDataViewMock({ id: undefined });
    expect(() => new IndexPatternSource(dv)).toThrow(/requires a DataView with an id/);
  });

  it('exposes kind = "index-pattern"', () => {
    const source = new IndexPatternSource(makeDataViewMock());
    expect(source.kind).toBe('index-pattern');
  });

  it('passes through id, name, title, timeFieldName from the DataView', () => {
    const dv = makeDataViewMock({
      id: 'dv-42',
      name: 'My View',
      indexPattern: 'metrics-*',
      timeFieldName: '@timestamp',
    });
    const source = new IndexPatternSource(dv);

    expect(source.id).toBe('dv-42');
    expect(source.name).toBe('My View');
    expect(source.title).toBe('metrics-*');
    expect(source.timeFieldName).toBe('@timestamp');
  });

  it('builds a self-referential index-pattern reference', () => {
    const source = new IndexPatternSource(makeDataViewMock({ id: 'dv-7' }));

    expect(source.references).toEqual([{ type: 'index-pattern', id: 'dv-7', name: 'data-source' }]);
  });

  describe('fields (DataViewBase compatibility)', () => {
    it('passes through dataView.fields.getAll() unchanged', () => {
      const fields: MockField[] = [
        { name: 'a', type: 'string', esTypes: ['keyword'] },
        { name: 'b', type: 'number', esTypes: ['long'] },
      ];
      const dv = makeDataViewMock({ fields });
      const source = new IndexPatternSource(dv);

      expect(source.fields).toBe(
        (dv.fields.getAll as jest.Mock).mock.results[0]?.value ?? source.fields
      );
      expect(source.fields).toEqual(fields);
    });
  });

  describe('getColumns / getColumn', () => {
    it('maps DataView fields to Columns with source = "index"', () => {
      const dv = makeDataViewMock({
        fields: [
          { name: 'host.name', type: 'string', esTypes: ['keyword'] },
          { name: 'bytes', type: 'number' },
        ],
      });
      const source = new IndexPatternSource(dv);

      expect(source.getColumns()).toEqual([
        { name: 'host.name', type: 'string', esType: 'keyword', source: 'index' },
        { name: 'bytes', type: 'number', esType: undefined, source: 'index' },
      ]);
    });

    it('returns the matching column from getColumn', () => {
      const dv = makeDataViewMock({
        fields: [{ name: 'host.name', type: 'string', esTypes: ['keyword'] }],
      });
      const source = new IndexPatternSource(dv);

      expect(source.getColumn('host.name')).toEqual({
        name: 'host.name',
        type: 'string',
        esType: 'keyword',
        source: 'index',
      });
    });

    it('returns undefined from getColumn for unknown names', () => {
      const dv = makeDataViewMock({ fields: [{ name: 'a', type: 'string' }] });
      const source = new IndexPatternSource(dv);

      expect(source.getColumn('does-not-exist')).toBeUndefined();
    });
  });

  describe('isTimeBased', () => {
    it('returns true when the DataView has a timeFieldName', () => {
      const source = new IndexPatternSource(makeDataViewMock({ timeFieldName: '@timestamp' }));
      expect(source.isTimeBased()).toBe(true);
    });

    it('returns false when timeFieldName is undefined', () => {
      const source = new IndexPatternSource(makeDataViewMock({ timeFieldName: undefined }));
      expect(source.isTimeBased()).toBe(false);
    });

    it('does not introspect the fields array', () => {
      const dv = makeDataViewMock({ timeFieldName: '@timestamp', fields: [] });
      const source = new IndexPatternSource(dv);

      expect(source.isTimeBased()).toBe(true);
      expect(dv.fields.getAll).not.toHaveBeenCalled();
      expect(dv.fields.getByName).not.toHaveBeenCalled();
    });
  });

  describe('isPersisted', () => {
    it('delegates to the wrapped DataView', () => {
      const persisted = new IndexPatternSource(makeDataViewMock({ persisted: true }));
      const adhoc = new IndexPatternSource(makeDataViewMock({ persisted: false }));

      expect(persisted.isPersisted()).toBe(true);
      expect(adhoc.isPersisted()).toBe(false);
    });
  });

  describe('serialize', () => {
    it('returns identity-only kind = "index-pattern" form', () => {
      const source = new IndexPatternSource(makeDataViewMock({ id: 'dv-9' }));

      expect(source.serialize()).toEqual({
        kind: 'index-pattern',
        id: 'dv-9',
        references: [{ type: 'index-pattern', id: 'dv-9', name: 'data-source' }],
      });
    });

    it('does not include columns or fields in the serialized form', () => {
      const source = new IndexPatternSource(
        makeDataViewMock({ fields: [{ name: 'a', type: 'string' }] })
      );

      expect(source.serialize()).not.toHaveProperty('fields');
      expect(source.serialize()).not.toHaveProperty('columns');
    });
  });

  describe('getDataView', () => {
    it('returns the underlying DataView instance', () => {
      const dv = makeDataViewMock();
      const source = new IndexPatternSource(dv);

      expect(source.getDataView()).toBe(dv);
    });
  });
});
