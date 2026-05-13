/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { EsqlSource } from './esql_source';

function makeColumn(
  name: string,
  type: string,
  esType?: string,
  isComputedColumn?: boolean
): DatatableColumn {
  return {
    id: name,
    name,
    meta: { type: type as DatatableColumn['meta']['type'], esType },
    ...(isComputedColumn ? { isComputedColumn: true } : {}),
  };
}

describe('EsqlSource', () => {
  describe('create', () => {
    it('extracts the title from the FROM clause', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-* | LIMIT 10',
        resultColumns: [],
      });
      expect(source.title).toBe('logs-*');
    });

    it('produces an id with the "esql-" prefix and a SHA-256 hex tail', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      expect(source.id).toMatch(/^esql-[0-9a-f]{64}$/);
    });

    it('is deterministic — same title and timeFieldName produce the same id', async () => {
      const a = await EsqlSource.create({
        query: 'FROM logs-* | LIMIT 10',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const b = await EsqlSource.create({
        query: 'FROM logs-* | KEEP message',
        resultColumns: [makeColumn('message', 'string')],
        timeFieldName: '@timestamp',
      });
      expect(a.id).toBe(b.id);
    });

    it('produces a different id when the timeFieldName differs', async () => {
      const a = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const b = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: 'event.created',
      });
      expect(a.id).not.toBe(b.id);
    });

    it('produces a different id when the title differs', async () => {
      const a = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });
      const b = await EsqlSource.create({
        query: 'FROM metrics-*',
        resultColumns: [],
      });
      expect(a.id).not.toBe(b.id);
    });
  });

  it('exposes kind = "esql"', async () => {
    const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });
    expect(source.kind).toBe('esql');
  });

  it('uses the title as the human-readable name', async () => {
    const source = await EsqlSource.create({
      query: 'FROM my_view',
      resultColumns: [],
    });
    expect(source.name).toBe(source.title);
    expect(source.name).toBe('my_view');
  });

  it('passes timeFieldName through unchanged', async () => {
    const withTime = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    const without = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [],
    });
    expect(withTime.timeFieldName).toBe('@timestamp');
    expect(without.timeFieldName).toBeUndefined();
  });

  it('builds a self-referential reference using its own id', async () => {
    const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });
    expect(source.references).toEqual([
      { type: 'index-pattern', id: source.id, name: 'data-source' },
    ]);
  });

  describe('getColumns / getColumn', () => {
    it('maps index-sourced DatatableColumns to Column with source = "index"', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [
          makeColumn('host.name', 'string', 'keyword'),
          makeColumn('bytes', 'number', 'long'),
        ],
      });
      expect(source.getColumns()).toEqual([
        { name: 'host.name', type: 'string', esType: 'keyword', source: 'index' },
        { name: 'bytes', type: 'number', esType: 'long', source: 'index' },
      ]);
    });

    it('maps computed DatatableColumns to Column with source = "esql-result"', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
        resultColumns: [makeColumn('avg_bytes', 'number', 'double', true)],
      });
      expect(source.getColumns()).toEqual([
        { name: 'avg_bytes', type: 'number', esType: 'double', source: 'esql-result' },
      ]);
    });

    it('returns the matching column from getColumn', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [makeColumn('bytes', 'number', 'long')],
      });
      expect(source.getColumn('bytes')).toEqual({
        name: 'bytes',
        type: 'number',
        esType: 'long',
        source: 'index',
      });
    });

    it('returns undefined from getColumn for unknown names', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [makeColumn('a', 'string')],
      });
      expect(source.getColumn('does-not-exist')).toBeUndefined();
    });

    it('handles an empty result set', async () => {
      const source = await EsqlSource.create({ query: 'FROM logs-*', resultColumns: [] });
      expect(source.getColumns()).toEqual([]);
      expect(source.fields).toEqual([]);
    });
  });

  describe('fields (DataViewBase compatibility)', () => {
    it('exposes columns as DataViewFieldBase[] with esTypes as a plural array', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [makeColumn('host.name', 'string', 'keyword')],
      });
      expect(source.fields).toEqual([{ name: 'host.name', type: 'string', esTypes: ['keyword'] }]);
    });

    it('omits esTypes when no esType is present', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [makeColumn('a', 'string')],
      });
      expect(source.fields).toEqual([{ name: 'a', type: 'string', esTypes: undefined }]);
    });
  });

  describe('isTimeBased', () => {
    it('returns true when timeFieldName is set', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      expect(source.isTimeBased()).toBe(true);
    });

    it('returns false when timeFieldName is undefined', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });
      expect(source.isTimeBased()).toBe(false);
    });

    it('does not require the time field to appear in result columns', async () => {
      // The query may DROP/KEEP the time field out of the result; the source
      // is still time-based as long as a time field is configured.
      const source = await EsqlSource.create({
        query: 'FROM logs-* | KEEP message',
        resultColumns: [makeColumn('message', 'string')],
        timeFieldName: '@timestamp',
      });
      expect(source.isTimeBased()).toBe(true);
      expect(source.getColumn('@timestamp')).toBeUndefined();
    });
  });

  describe('resultColumns', () => {
    it('exposes the raw DatatableColumns it was constructed with', async () => {
      const cols = [
        makeColumn('host.name', 'string', 'keyword'),
        makeColumn('bytes', 'number', 'long'),
      ];
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: cols,
      });
      expect(source.resultColumns).toEqual(cols);
    });
  });

  describe('isPersisted', () => {
    it('always returns false (ES|QL sources are never saved as DataView SOs)', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      expect(source.isPersisted()).toBe(false);
    });
  });

  describe('serialize', () => {
    it('returns identity-only kind = "esql" form', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [makeColumn('a', 'string')],
        timeFieldName: '@timestamp',
      });
      expect(source.serialize()).toEqual({
        kind: 'esql',
        id: source.id,
        title: 'logs-*',
        timeFieldName: '@timestamp',
        references: source.references,
      });
    });

    it('does not include columns or fields in the serialized form', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [makeColumn('a', 'string')],
      });
      const serialized = source.serialize();
      expect(serialized).not.toHaveProperty('fields');
      expect(serialized).not.toHaveProperty('columns');
    });
  });
});
