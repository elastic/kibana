/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { HttpStart } from '@kbn/core/public';
import { ESQLVariableType, SOURCE_INFO_ROUTE, TIMEFIELD_ROUTE } from '@kbn/esql-types';
import { clearESQLSourceInfoCache } from '@kbn/esql-utils';
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
  beforeEach(() => {
    EsqlSource.clearCache();
    clearESQLSourceInfoCache();
  });

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

    it('is deterministic — same query and timeFieldName produce the same id', async () => {
      const a = await EsqlSource.create({
        query: 'FROM logs-* | LIMIT 10',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const b = await EsqlSource.create({
        query: 'FROM logs-* | LIMIT 10',
        resultColumns: [makeColumn('message', 'string')],
        timeFieldName: '@timestamp',
      });
      expect(a.id).toBe(b.id);
    });

    it('produces a different id when the query differs but title is the same', async () => {
      const a = await EsqlSource.create({
        query: 'FROM logs-* | LIMIT 10',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const b = await EsqlSource.create({
        query: 'FROM logs-* | KEEP message',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      expect(a.id).not.toBe(b.id);
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

    it('keeps the same datasetKey when the query changes but FROM and time field do not', async () => {
      const sort = await EsqlSource.create({
        query: 'FROM logs-* | SORT @timestamp DESC',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const where = await EsqlSource.create({
        query: 'FROM logs-* | WHERE bytes > 0',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const evalQuery = await EsqlSource.create({
        query: 'FROM logs-* | EVAL extra = 1',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      expect(sort.id).not.toBe(where.id);
      expect(sort.datasetKey).toBe('esql:logs-*:@timestamp:');
      expect(sort.datasetKey).toBe(where.datasetKey);
      expect(sort.datasetKey).toBe(evalQuery.datasetKey);
    });

    it('uses a different datasetKey when the FROM or time field changes', async () => {
      const logs = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const metrics = await EsqlSource.create({
        query: 'FROM metrics-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const otherTime = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: 'event.created',
      });
      expect(logs.datasetKey).not.toBe(metrics.datasetKey);
      expect(logs.datasetKey).not.toBe(otherTime.datasetKey);
    });

    it('uses a different datasetKey when projectRouting differs', async () => {
      const a = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
        projectRouting: 'project-a',
      });
      const b = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
        projectRouting: 'project-b',
      });
      expect(a.datasetKey).toBe('esql:logs-*:@timestamp:project-a');
      expect(b.datasetKey).toBe('esql:logs-*:@timestamp:project-b');
    });

    it('prefers SET project_routing over the picker arg in datasetKey', async () => {
      const source = await EsqlSource.create({
        query: 'SET project_routing = "_alias:project-a"; FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
        projectRouting: 'project-b',
      });
      expect(source.datasetKey).toBe('esql:logs-*:@timestamp:_alias:project-a');
    });

    it('produces a different id when projectRouting differs', async () => {
      const a = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        projectRouting: 'project-a',
      });
      const b = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        projectRouting: 'project-b',
      });
      expect(a.id).not.toBe(b.id);
    });

    it('produces a different id with vs without projectRouting', async () => {
      const withRouting = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        projectRouting: 'project-a',
      });
      const withoutRouting = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });
      expect(withRouting.id).not.toBe(withoutRouting.id);
    });

    it('returns the cached instance on a later create for the same query identity', async () => {
      const first = await EsqlSource.create({
        query: 'FROM logs-* | LIMIT 10',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const second = await EsqlSource.create({
        query: 'FROM logs-* | LIMIT 10',
        resultColumns: [makeColumn('message', 'string')],
        timeFieldName: '@timestamp',
      });
      expect(second).toBe(first);
      expect(second.getColumns()).toEqual([]);
    });

    it('produces a different id when control variable values differ', async () => {
      const query = 'FROM logs-* | KEEP ??field';
      const a = await EsqlSource.create({
        query,
        resultColumns: [],
        esqlVariables: [{ key: 'field', value: 'message', type: ESQLVariableType.FIELDS }],
      });
      const b = await EsqlSource.create({
        query,
        resultColumns: [],
        esqlVariables: [{ key: 'field', value: 'host.name', type: ESQLVariableType.FIELDS }],
      });
      expect(a.id).not.toBe(b.id);
    });

    it('produces the same id when control variable values match', async () => {
      const query = 'FROM logs-* | KEEP ??field';
      const variables = [{ key: 'field', value: 'message', type: ESQLVariableType.FIELDS }];
      const a = await EsqlSource.create({
        query,
        resultColumns: [],
        esqlVariables: variables,
      });
      const b = await EsqlSource.create({
        query,
        resultColumns: [],
        esqlVariables: [...variables],
      });
      expect(a.id).toBe(b.id);
    });

    it('trims the query for identity so padding does not create a new id', async () => {
      const padded = await EsqlSource.create({
        query: '  FROM logs-*  ',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const trimmed = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      expect(padded.query).toBe('FROM logs-*');
      expect(trimmed).toBe(padded);
      expect(trimmed.id).toBe(padded.id);
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

  describe('isRollup', () => {
    it('always returns false', async () => {
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });
      expect(source.isRollup()).toBe(false);
    });
  });

  describe('withColumns', () => {
    it('returns a new instance with the same identity and updated result columns', async () => {
      const originalCols = [makeColumn('message', 'string')];
      const original = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: originalCols,
        timeFieldName: '@timestamp',
      });
      const updatedCols = [
        { ...makeColumn('message', 'string'), isNull: true },
        makeColumn('bytes', 'number', 'long'),
      ];
      const updated = original.withColumns(updatedCols);

      expect(updated).not.toBe(original);
      expect(updated.id).toBe(original.id);
      expect(updated.query).toBe(original.query);
      expect(updated.timeFieldName).toBe('@timestamp');
      expect(updated.projectRouting).toBe(original.projectRouting);
      expect(updated.datasetKey).toBe(original.datasetKey);
      expect(updated.resultColumns).toEqual(updatedCols);
      expect(original.resultColumns).toEqual(originalCols);
      expect(updated.getColumns().map((column) => column.name)).toEqual(['message', 'bytes']);
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

  describe('create with http', () => {
    const postedPaths = (http: HttpStart) =>
      (http.post as jest.Mock).mock.calls.map((call) => call[0] as string);

    const createHttp = (overrides?: {
      sourceInfo?: { columns: Array<{ name: string; esType: string }> };
      timeField?: string;
      sourceInfoError?: Error;
    }): HttpStart => {
      return {
        post: jest.fn(async (path: string) => {
          if (path === SOURCE_INFO_ROUTE) {
            if (overrides?.sourceInfoError) {
              throw overrides.sourceInfoError;
            }
            return overrides?.sourceInfo ?? { columns: [] };
          }
          if (path === TIMEFIELD_ROUTE) {
            return { timeField: overrides?.timeField };
          }
          throw new Error(`unexpected path ${path}`);
        }),
      } as unknown as HttpStart;
    };

    it('resolves time field and LIMIT 0 schema in parallel', async () => {
      const http = createHttp({
        timeField: '@timestamp',
        sourceInfo: {
          columns: [
            { name: 'message', esType: 'keyword' },
            { name: 'bytes', esType: 'long' },
          ],
        },
      });

      const source = await EsqlSource.create({
        query: 'FROM logs-http-parallel-*',
        http,
      });

      expect(postedPaths(http).sort()).toEqual([SOURCE_INFO_ROUTE, TIMEFIELD_ROUTE].sort());
      expect(source.timeFieldName).toBe('@timestamp');
      expect(source.getColumns()).toEqual([
        { name: 'message', type: 'string', esType: 'keyword', source: 'index' },
        { name: 'bytes', type: 'number', esType: 'long', source: 'index' },
      ]);
    });

    it('marks STATS/EVAL columns as computed', async () => {
      const http = createHttp({
        timeField: '@timestamp',
        sourceInfo: { columns: [{ name: 'avg_bytes', esType: 'double' }] },
      });

      const source = await EsqlSource.create({
        query: 'FROM logs-http-computed-* | STATS avg_bytes = AVG(bytes)',
        http,
        timeFieldName: '@timestamp',
      });

      expect(source.getColumns()).toEqual([
        { name: 'avg_bytes', type: 'number', esType: 'double', source: 'esql-result' },
      ]);
    });

    it('skips source_info when resultColumns is already provided', async () => {
      const http = createHttp({
        timeField: '@timestamp',
        sourceInfo: { columns: [{ name: 'ignored', esType: 'keyword' }] },
      });

      const source = await EsqlSource.create({
        query: 'FROM logs-http-skip-*',
        http,
        timeFieldName: '@timestamp',
        resultColumns: [makeColumn('message', 'string', 'keyword')],
      });

      expect(postedPaths(http)).not.toContain(SOURCE_INFO_ROUTE);
      expect(postedPaths(http)).not.toContain(TIMEFIELD_ROUTE);
      expect(source.getColumns()).toEqual([
        { name: 'message', type: 'string', esType: 'keyword', source: 'index' },
      ]);
    });

    it('falls back to empty columns when source_info fails', async () => {
      const http = createHttp({
        timeField: '@timestamp',
        sourceInfoError: new Error('source_info failed'),
      });

      const source = await EsqlSource.create({
        query: 'FROM logs-http-fail-*',
        http,
        timeFieldName: '@timestamp',
      });

      expect(source.getColumns()).toEqual([]);
      expect(source.timeFieldName).toBe('@timestamp');
    });

    it('retries source_info after a failed create instead of returning a cached empty schema', async () => {
      const query = 'FROM logs-http-retry-*';
      const failed = await EsqlSource.create({
        query,
        http: createHttp({
          timeField: '@timestamp',
          sourceInfoError: new Error('source_info failed'),
        }),
        timeFieldName: '@timestamp',
      });
      const recovered = await EsqlSource.create({
        query,
        http: createHttp({
          timeField: '@timestamp',
          sourceInfo: { columns: [{ name: 'message', esType: 'keyword' }] },
        }),
        timeFieldName: '@timestamp',
      });

      expect(failed.getColumns()).toEqual([]);
      expect(recovered).not.toBe(failed);
      expect(recovered.getColumns()).toEqual([
        { name: 'message', type: 'string', esType: 'keyword', source: 'index' },
      ]);
    });

    it('skips a second HTTP round-trip on cache hit', async () => {
      const http = createHttp({
        timeField: '@timestamp',
        sourceInfo: { columns: [{ name: 'message', esType: 'keyword' }] },
      });
      const query = 'FROM logs-http-cache-*';

      const first = await EsqlSource.create({ query, http });
      const second = await EsqlSource.create({ query, http });

      expect(second).toBe(first);
      expect(postedPaths(http).filter((path) => path === SOURCE_INFO_ROUTE)).toHaveLength(1);
      expect(postedPaths(http).filter((path) => path === TIMEFIELD_ROUTE)).toHaveLength(1);
    });
  });
});
