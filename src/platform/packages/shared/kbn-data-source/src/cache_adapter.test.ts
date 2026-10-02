/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { SOURCE_INFO_ROUTE } from '@kbn/esql-types';
import { clearESQLSourceInfoCache } from '@kbn/esql-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { registerEsqlSourceInDataViewsCache, unregisterFromDataViewsCache } from './cache_adapter';
import { EsqlSource } from './sources/esql_source';

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

function createMockDataViewsService() {
  return {
    create: jest.fn(async (spec: Record<string, unknown>) => spec),
    clearInstanceCache: jest.fn(),
  } as unknown as DataViewsPublicPluginStart;
}

describe('registerEsqlSourceInDataViewsCache', () => {
  beforeEach(() => {
    EsqlSource.clearCache();
    clearESQLSourceInfoCache();
  });

  describe('with the schema of the FROM target', () => {
    const createHttp = (columns: Array<{ name: string; esType: string }>) =>
      ({
        post: jest.fn(async () => ({ columns })),
      } as unknown as HttpStart);

    const sourceColumns = [
      { name: '@timestamp', esType: 'date' },
      { name: 'bytes', esType: 'long' },
      { name: 'message', esType: 'text' },
    ];

    it('uses the fields of the bare FROM, not the result columns of the query', async () => {
      const dataViews = createMockDataViewsService();
      const http = createHttp(sourceColumns);
      const source = await EsqlSource.create({
        query: 'FROM logs-* | KEEP bytes',
        resultColumns: [makeColumn('bytes', 'number', 'long')],
        timeFieldName: '@timestamp',
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source, http);

      const [path, { body }] = (http.post as jest.Mock).mock.calls[0];
      expect(path).toBe(SOURCE_INFO_ROUTE);
      expect(JSON.parse(body).query).toBe('FROM logs-*');
      const spec = (dataViews.create as jest.Mock).mock.calls[0][0] as {
        fields: Record<string, unknown>;
      };
      expect(Object.keys(spec.fields).sort()).toEqual(['@timestamp', 'bytes', 'message']);
    });

    it('does not mark source fields as computed, even when the query computes a column', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
        resultColumns: [makeColumn('avg_bytes', 'number', 'double', true)],
        timeFieldName: '@timestamp',
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source, createHttp(sourceColumns));

      const spec = (dataViews.create as jest.Mock).mock.calls[0][0] as {
        fields: Record<string, { isComputedColumn?: boolean }>;
      };
      expect(spec.fields).not.toHaveProperty('avg_bytes');
      expect(spec.fields.bytes.isComputedColumn).toBe(false);
    });

    it('requests the schema once for queries on the same dataset', async () => {
      const dataViews = createMockDataViewsService();
      const http = createHttp(sourceColumns);
      const first = await EsqlSource.create({ query: 'FROM logs-* | KEEP bytes' });
      const second = await EsqlSource.create({ query: 'FROM logs-* | KEEP message' });

      await registerEsqlSourceInDataViewsCache(dataViews, first, http);
      await registerEsqlSourceInDataViewsCache(dataViews, second, http);

      expect(http.post).toHaveBeenCalledTimes(1);
    });

    it('keeps the time field when the source schema does not contain it', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM logs-* | KEEP bytes',
        timeFieldName: 'event.ingested',
      });

      await registerEsqlSourceInDataViewsCache(
        dataViews,
        source,
        createHttp([{ name: 'bytes', esType: 'long' }])
      );

      const spec = (dataViews.create as jest.Mock).mock.calls[0][0] as {
        fields: Record<string, { type: string }>;
      };
      expect(spec.fields['event.ingested'].type).toBe(KBN_FIELD_TYPES.DATE);
    });

    it('falls back to the result columns when the schema cannot be fetched', async () => {
      const dataViews = createMockDataViewsService();
      const http = {
        post: jest.fn(async () => {
          throw new Error('source info failed');
        }),
      } as unknown as HttpStart;
      const source = await EsqlSource.create({
        query: 'FROM logs-* | KEEP bytes',
        resultColumns: [makeColumn('bytes', 'number', 'long')],
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source, http);

      const spec = (dataViews.create as jest.Mock).mock.calls[0][0] as {
        fields: Record<string, unknown>;
      };
      expect(Object.keys(spec.fields)).toEqual(['bytes']);
    });

    it('creates the DataView with skipFetchFields', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({ query: 'FROM logs-* | KEEP bytes' });

      await registerEsqlSourceInDataViewsCache(dataViews, source, createHttp(sourceColumns));

      expect(dataViews.create).toHaveBeenCalledWith(expect.anything(), true);
    });
  });

  describe('without http, falling back to the result columns', () => {
    it('creates an ad-hoc DataView with LIMIT 0 columns and skipFetchFields', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [
          makeColumn('message', 'string', 'keyword'),
          makeColumn('bytes', 'number', 'long'),
        ],
        timeFieldName: '@timestamp',
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source);

      expect(dataViews.clearInstanceCache).toHaveBeenCalledWith(source.id);
      expect(dataViews.create).toHaveBeenCalledWith(
        {
          id: source.id,
          title: 'logs-*',
          type: ESQL_TYPE,
          timeFieldName: '@timestamp',
          fields: {
            message: {
              name: 'message',
              type: KBN_FIELD_TYPES.STRING,
              esTypes: ['keyword'],
              searchable: true,
              aggregatable: false,
              isComputedColumn: false,
            },
            bytes: {
              name: 'bytes',
              type: KBN_FIELD_TYPES.NUMBER,
              esTypes: ['long'],
              searchable: true,
              aggregatable: false,
              isComputedColumn: false,
            },
            '@timestamp': {
              name: '@timestamp',
              type: KBN_FIELD_TYPES.DATE,
              esTypes: ['date'],
              searchable: true,
              aggregatable: true,
              isComputedColumn: false,
            },
          },
        },
        true
      );
    });

    it('copies query result columns onto the DataView spec', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM logs-* | KEEP message',
        resultColumns: [makeColumn('message', 'string', 'keyword')],
        timeFieldName: '@timestamp',
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source);

      const spec = (dataViews.create as jest.Mock).mock.calls[0][0] as {
        fields: Record<string, unknown>;
      };
      expect(spec.fields).toHaveProperty('message');
      expect(spec.fields).toHaveProperty('@timestamp');
    });

    it('marks EVAL/STATS columns as computed', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
        resultColumns: [makeColumn('avg_bytes', 'number', 'double', true)],
        timeFieldName: '@timestamp',
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source);

      const spec = (dataViews.create as jest.Mock).mock.calls[0][0] as {
        fields: Record<string, { isComputedColumn?: boolean }>;
      };
      expect(spec.fields.avg_bytes.isComputedColumn).toBe(true);
    });

    it('creates fields from result columns when the source has no time field', async () => {
      const dataViews = createMockDataViewsService();
      const source = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [makeColumn('message', 'string')],
      });

      await registerEsqlSourceInDataViewsCache(dataViews, source);

      expect(dataViews.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeFieldName: undefined,
          fields: {
            message: {
              name: 'message',
              type: KBN_FIELD_TYPES.STRING,
              esTypes: undefined,
              searchable: true,
              aggregatable: false,
              isComputedColumn: false,
            },
          },
        }),
        true
      );
    });
  });
});

describe('unregisterFromDataViewsCache', () => {
  it('clears the DataViews instance cache for the given id', () => {
    const dataViews = createMockDataViewsService();
    unregisterFromDataViewsCache(dataViews, 'esql-abc');
    expect(dataViews.clearInstanceCache).toHaveBeenCalledWith('esql-abc');
  });
});
