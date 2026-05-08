/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceService, type DataViewLookup } from './data_source_service';
import { EsqlSource } from './esql_source';
import { IndexPatternSource } from './index_pattern_source';

function makeDataViewMock(id: string): DataView {
  return {
    id,
    timeFieldName: undefined,
    getName: jest.fn(() => 'mock'),
    getIndexPattern: jest.fn(() => 'logs-*'),
    fields: {
      getAll: jest.fn(() => []),
      getByName: jest.fn(),
    },
  } as unknown as DataView;
}

function makeDataViewLookup(impl: (id: string) => Promise<DataView>): DataViewLookup {
  return { get: jest.fn(impl) };
}

describe('DataSourceService', () => {
  describe('get for index-pattern ids', () => {
    it('delegates to the DataView lookup and wraps the result in an IndexPatternSource', async () => {
      const dv = makeDataViewMock('dv-42');
      const lookup = makeDataViewLookup(async () => dv);
      const service = new DataSourceService(lookup);

      const source = await service.get('dv-42');

      expect(lookup.get).toHaveBeenCalledWith('dv-42');
      expect(source).toBeInstanceOf(IndexPatternSource);
      expect(source?.id).toBe('dv-42');
    });

    it('returns undefined when the DataView lookup throws', async () => {
      const lookup = makeDataViewLookup(async () => {
        throw new Error('not found');
      });
      const service = new DataSourceService(lookup);

      expect(await service.get('missing-dv')).toBeUndefined();
    });
  });

  describe('get for esql ids', () => {
    it('returns the registered EsqlSource', async () => {
      const lookup = makeDataViewLookup(async () => {
        throw new Error('should not be called for esql ids');
      });
      const service = new DataSourceService(lookup);
      const esql = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });

      service.registerEsqlSource(esql);

      expect(await service.get(esql.id)).toBe(esql);
      expect(lookup.get).not.toHaveBeenCalled();
    });

    it('returns undefined when no EsqlSource is registered for the id', async () => {
      const lookup = makeDataViewLookup(async () => {
        throw new Error('should not be called for esql ids');
      });
      const service = new DataSourceService(lookup);

      expect(await service.get('esql-deadbeef')).toBeUndefined();
      expect(lookup.get).not.toHaveBeenCalled();
    });
  });

  describe('fromDataView', () => {
    it('wraps a DataView in IndexPatternSource synchronously (no lookup)', async () => {
      const dv = makeDataViewMock('dv-42');
      const lookup = makeDataViewLookup(async () => {
        throw new Error('should not be called for fromDataView');
      });
      const service = new DataSourceService(lookup);

      const source = service.fromDataView(dv);

      expect(source).toBeInstanceOf(IndexPatternSource);
      expect(source?.id).toBe('dv-42');
      expect(lookup.get).not.toHaveBeenCalled();
    });

    it('returns the registered EsqlSource when the DataView has an esql- id', async () => {
      const lookup = makeDataViewLookup(async () => {
        throw new Error('should not be called for esql ids');
      });
      const service = new DataSourceService(lookup);
      const esql = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });
      service.registerEsqlSource(esql);

      const dv = makeDataViewMock(esql.id);
      expect(service.fromDataView(dv)).toBe(esql);
    });

    it('returns undefined when the DataView has an esql- id but no source is registered', () => {
      const lookup = makeDataViewLookup(async () => {
        throw new Error('not used');
      });
      const service = new DataSourceService(lookup);
      const dv = makeDataViewMock('esql-deadbeef');

      expect(service.fromDataView(dv)).toBeUndefined();
    });

    it('returns undefined when the DataView has no id', () => {
      const lookup = makeDataViewLookup(async () => {
        throw new Error('not used');
      });
      const service = new DataSourceService(lookup);
      const dv = { id: undefined } as unknown as DataView;

      expect(service.fromDataView(dv)).toBeUndefined();
    });
  });

  describe('register / unregister', () => {
    let service: DataSourceService;

    beforeEach(() => {
      const lookup = makeDataViewLookup(async () => {
        throw new Error('not used in these tests');
      });
      service = new DataSourceService(lookup);
    });

    it('round-trips register → get', async () => {
      const esql = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });
      service.registerEsqlSource(esql);
      expect(await service.get(esql.id)).toBe(esql);
    });

    it('removes the source on unregister', async () => {
      const esql = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
      });
      service.registerEsqlSource(esql);
      service.unregisterEsqlSource(esql.id);

      expect(await service.get(esql.id)).toBeUndefined();
    });

    it('is last-write-wins when the same id is registered twice', async () => {
      // Same query + timeField → same id. Different result columns → different instances.
      const first = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      const second = await EsqlSource.create({
        query: 'FROM logs-*',
        resultColumns: [],
        timeFieldName: '@timestamp',
      });
      expect(first.id).toBe(second.id); // sanity

      service.registerEsqlSource(first);
      service.registerEsqlSource(second);

      expect(await service.get(first.id)).toBe(second);
    });
  });
});
