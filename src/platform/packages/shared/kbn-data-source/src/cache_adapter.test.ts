/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { registerEsqlSourceInDataViewsCache, unregisterFromDataViewsCache } from './cache_adapter';
import { EsqlSource } from './sources/esql_source';

function makeColumn(name: string, type: string, esType?: string): DatatableColumn {
  return {
    id: name,
    name,
    meta: { type: type as DatatableColumn['meta']['type'], esType },
  };
}

function createMockDataViewsService() {
  return {
    create: jest.fn(async (spec: Record<string, unknown>) => spec),
    clearInstanceCache: jest.fn(),
  } as unknown as DataViewsPublicPluginStart;
}

describe('registerEsqlSourceInDataViewsCache', () => {
  beforeEach(() => EsqlSource.clearCache());

  it('creates an ad-hoc DataView with only the time field in fields', async () => {
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
          '@timestamp': {
            name: '@timestamp',
            type: KBN_FIELD_TYPES.DATE,
            esTypes: ['date'],
            searchable: true,
            aggregatable: true,
          },
        },
      },
      true
    );
  });

  it('does not copy query result columns onto the DataView spec', async () => {
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
    expect(spec.fields).not.toHaveProperty('message');
    expect(Object.keys(spec.fields)).toEqual(['@timestamp']);
  });

  it('creates an empty fields spec when the source has no time field', async () => {
    const dataViews = createMockDataViewsService();
    const source = await EsqlSource.create({
      query: 'FROM logs-*',
      resultColumns: [makeColumn('message', 'string')],
    });

    await registerEsqlSourceInDataViewsCache(dataViews, source);

    expect(dataViews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        timeFieldName: undefined,
        fields: {},
      }),
      true
    );
  });
});

describe('unregisterFromDataViewsCache', () => {
  it('clears the DataViews instance cache for the given id', () => {
    const dataViews = createMockDataViewsService();
    unregisterFromDataViewsCache(dataViews, 'esql-abc');
    expect(dataViews.clearInstanceCache).toHaveBeenCalledWith('esql-abc');
  });
});
