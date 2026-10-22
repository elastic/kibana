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
import {
  clearESQLSourceInfoCache,
  ESQL_SOURCE_INFO_CACHE_TTL,
  getESQLAdHocDataviewId,
} from '@kbn/esql-utils';
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

const postedPathsOf = (http: HttpStart) =>
  (http.post as jest.Mock).mock.calls.map((call) => call[0] as string);

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

    it('keeps the same datasetId when the query changes but FROM and time field do not', async () => {
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
      expect(sort.datasetId).toBe(
        await getESQLAdHocDataviewId({
          indexPattern: 'logs-*',
          timeFieldName: '@timestamp',
          projectRouting: undefined,
        })
      );
      expect(sort.datasetId).toBe(where.datasetId);
      expect(sort.datasetId).toBe(evalQuery.datasetId);
    });

    it('uses a different datasetId when the FROM or time field changes', async () => {
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
      expect(logs.datasetId).not.toBe(metrics.datasetId);
      expect(logs.datasetId).not.toBe(otherTime.datasetId);
    });

    it('uses a different datasetId when projectRouting differs', async () => {
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
      expect(a.datasetId).toBe(
        await getESQLAdHocDataviewId({
          indexPattern: 'logs-*',
          timeFieldName: '@timestamp',
          projectRouting: 'project-a',
        })
      );
      expect(a.datasetId).not.toBe(b.datasetId);
    });

    it('prefers SET project_routing over the picker arg in datasetId', async () => {
      const source = await EsqlSource.create({
        query: 'SET project_routing = "_alias:project-a"; FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
        projectRouting: 'project-b',
      });
      expect(source.datasetId).toBe(
        await getESQLAdHocDataviewId({
          indexPattern: 'logs-*',
          timeFieldName: '@timestamp',
          projectRouting: '_alias:project-a',
        })
      );
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
      expect(updated.datasetId).toBe(original.datasetId);
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

  describe('cache expiry', () => {
    afterEach(() => jest.restoreAllMocks());

    it('picks up new fields once the cache expires', async () => {
      // The LRU cache reads `performance.now()`, which fake timers do not reach.
      let now = performance.now();
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      const columnsResponse = (names: string[]) => ({
        columns: names.map((name) => ({ name, esType: 'keyword' })),
      });
      const http = {
        post: jest.fn(async (path: string) =>
          path === TIMEFIELD_ROUTE ? { timeField: undefined } : columnsResponse(['a'])
        ),
      } as unknown as HttpStart;
      const columnNames = async () =>
        (await EsqlSource.create({ query: 'FROM ttl-*', http }))
          .getColumns()
          .map(({ name }) => name);

      expect(await columnNames()).toEqual(['a']);
      (http.post as jest.Mock).mockImplementation(async (path: string) =>
        path === TIMEFIELD_ROUTE ? { timeField: undefined } : columnsResponse(['a', 'b'])
      );
      expect(await columnNames()).toEqual(['a']);

      now += ESQL_SOURCE_INFO_CACHE_TTL + 1;
      // Let the cache drop the time it memoizes for a millisecond.
      await new Promise((resolve) => setTimeout(resolve, 5));

      expect(await columnNames()).toEqual(['a', 'b']);
    });
  });

  describe('resolveTimeField', () => {
    const createHttp = () =>
      ({
        post: jest.fn(async (path: string) =>
          path === TIMEFIELD_ROUTE ? { timeField: '@timestamp' } : { columns: [] }
        ),
      } as unknown as HttpStart);

    it('skips the time field request when set to false', async () => {
      const http = createHttp();

      const source = await EsqlSource.create({
        query: 'FROM skip-time',
        http,
        resolveTimeField: false,
      });

      expect(source.timeFieldName).toBeUndefined();
      expect(postedPathsOf(http)).toEqual([SOURCE_INFO_ROUTE]);
    });

    it('uses a time field that is already resolved, without requesting it', async () => {
      const http = createHttp();
      await EsqlSource.create({ query: 'FROM known-time | LIMIT 10', http });
      (http.post as jest.Mock).mockClear();

      const source = await EsqlSource.create({
        query: 'FROM known-time',
        http,
        resolveTimeField: false,
      });

      expect(source.timeFieldName).toBe('@timestamp');
      expect(postedPathsOf(http)).toEqual([SOURCE_INFO_ROUTE]);
    });

    it('prefers an instance with its time field once one exists', async () => {
      const http = createHttp();
      const schemaOnly = await EsqlSource.create({
        query: 'FROM later-time',
        http,
        resolveTimeField: false,
      });
      expect(schemaOnly.timeFieldName).toBeUndefined();
      await EsqlSource.create({ query: 'FROM later-time', http });

      const source = await EsqlSource.create({
        query: 'FROM later-time',
        http,
        resolveTimeField: false,
      });

      expect(source.timeFieldName).toBe('@timestamp');
    });

    it('never returns an instance without its time field to a caller that needs it', async () => {
      const http = createHttp();
      await EsqlSource.create({ query: 'FROM shared-time', http, resolveTimeField: false });

      const source = await EsqlSource.create({ query: 'FROM shared-time', http });

      expect(source.timeFieldName).toBe('@timestamp');
    });
  });

  describe('resolveDataset', () => {
    const createHttp = () =>
      ({
        post: jest.fn(async (path: string) =>
          path === TIMEFIELD_ROUTE ? { timeField: '@timestamp' } : { columns: [] }
        ),
      } as unknown as HttpStart);

    it('resolves the time field without requesting the schema', async () => {
      const http = createHttp();

      const dataset = await EsqlSource.resolveDataset({
        query: 'FROM dataset-time | LIMIT 5',
        http,
      });

      expect(dataset.title).toBe('dataset-time');
      expect(dataset.timeFieldName).toBe('@timestamp');
      expect(postedPathsOf(http)).toEqual([TIMEFIELD_ROUTE]);
    });

    it('has the same datasetId as the source of the same dataset', async () => {
      const http = createHttp();
      const dataset = await EsqlSource.resolveDataset({
        query: 'FROM same-dataset | LIMIT 5',
        http,
      });

      const source = await EsqlSource.create({
        query: 'FROM same-dataset | WHERE a > 1',
        http,
      });

      expect(dataset.datasetId).toBe(source.datasetId);
      expect(dataset.datasetId).toBe(
        await getESQLAdHocDataviewId({
          indexPattern: 'same-dataset',
          timeFieldName: '@timestamp',
          projectRouting: undefined,
        })
      );
    });

    it('does not request the time field when it is given', async () => {
      const http = createHttp();

      const dataset = await EsqlSource.resolveDataset({
        query: 'FROM given-time',
        timeFieldName: 'event.created',
        http,
      });

      expect(dataset.timeFieldName).toBe('event.created');
      expect(postedPathsOf(http)).toEqual([]);
    });

    it('prefers SET project_routing over the picker arg', async () => {
      const dataset = await EsqlSource.resolveDataset({
        query: 'SET project_routing = "_alias:project-a"; FROM logs-*',
        timeFieldName: '@timestamp',
        projectRouting: 'project-b',
      });

      expect(dataset.projectRouting).toBe('_alias:project-a');
    });

    it('does not populate the instance cache, so a later create still resolves the schema', async () => {
      const http = createHttp();
      await EsqlSource.resolveDataset({ query: 'FROM no-poison', http });
      (http.post as jest.Mock).mockClear();

      await EsqlSource.create({ query: 'FROM no-poison', http });

      expect(postedPathsOf(http)).toContain(SOURCE_INFO_ROUTE);
    });
  });

  describe('getFilterableFields', () => {
    const createSchemaHttp = (schemas: Record<string, string[]>): HttpStart =>
      ({
        post: jest.fn(async (path: string, { body }: { body: string }) => {
          if (path === TIMEFIELD_ROUTE) {
            return { timeField: '@timestamp' };
          }
          const { query } = JSON.parse(body) as { query: string };
          return { columns: (schemas[query] ?? []).map((name) => ({ name, esType: 'keyword' })) };
        }),
      } as unknown as HttpStart);

    const names = (columns: ReadonlyArray<{ name: string }>) => columns.map(({ name }) => name);

    it('returns the fields of the FROM target, not the result columns', async () => {
      const http = createSchemaHttp({
        'FROM filterable-* | STATS count = COUNT(*) BY host': ['count', 'host'],
        'FROM filterable-*': ['@timestamp', 'host', 'message'],
      });
      const source = await EsqlSource.create({
        query: 'FROM filterable-* | STATS count = COUNT(*) BY host',
        http,
      });

      expect(names(source.getColumns())).toEqual(['count', 'host']);
      expect(names(await source.getFilterableFields(http))).toEqual([
        '@timestamp',
        'host',
        'message',
      ]);
    });

    it('resolves the schema of a dataset once for all queries on it', async () => {
      const http = createSchemaHttp({ 'FROM once-*': ['host'] });
      const first = await EsqlSource.create({ query: 'FROM once-* | KEEP host', http });
      const second = await EsqlSource.create({ query: 'FROM once-* | SORT host', http });
      (http.post as jest.Mock).mockClear();

      await first.getFilterableFields(http);
      await second.getFilterableFields(http);

      expect(http.post).toHaveBeenCalledTimes(1);
    });

    it('resolves the schema with http after an earlier call without http', async () => {
      const http = createSchemaHttp({ 'FROM later-*': ['host'] });
      const source = await EsqlSource.create({
        query: 'FROM later-* | STATS c = COUNT(*) BY host',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });

      expect(await source.getFilterableFields()).toEqual([]);
      expect(names(await source.getFilterableFields(http))).toEqual(['host']);
    });

    it('does not request the time field for the dataset of a source without one', async () => {
      const http = {
        post: jest.fn(async (path: string) =>
          path === TIMEFIELD_ROUTE ? { timeField: undefined } : { columns: [] }
        ),
      } as unknown as HttpStart;
      const source = await EsqlSource.create({
        query: 'FROM no-time | KEEP host',
        resultColumns: [],
        timeFieldName: undefined,
        resolveTimeField: false,
      });

      await source.getFilterableFields(http);

      expect(postedPathsOf(http)).toEqual([SOURCE_INFO_ROUTE]);
    });

    it('falls back to the result columns when the query has no FROM or TS command', async () => {
      const source = await EsqlSource.create({
        query: 'ROW a = 1',
        resultColumns: [makeColumn('a', 'number')],
      });

      expect(names(await source.getFilterableFields())).toEqual(['a']);
    });
  });
});
