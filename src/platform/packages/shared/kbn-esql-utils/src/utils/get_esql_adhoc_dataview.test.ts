/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core/public';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';

function createMockDataViewsService() {
  return {
    create: jest.fn(async (spec: Record<string, unknown>) => ({
      id: spec.id,
      title: spec.title,
      timeFieldName: spec.timeFieldName,
      toSpec: jest.fn(() => ({ ...spec })),
    })),
    clearInstanceCache: jest.fn(),
  } as unknown as DataViewsPublicPluginStart;
}

function createMockHttp(timeField?: string) {
  return {
    get: jest.fn(async () => ({ timeField })),
  } as unknown as HttpStart;
}

// Each test uses a unique query to avoid cross-test cache contamination
// (the module-level timeFieldCache persists across tests within a suite).
let queryCounter = 0;
const uniqueQuery = (index: string = 'logs') => `FROM ${index}_${++queryCounter}`;

describe('getESQLAdHocDataview', () => {
  let dataViewsService: DataViewsPublicPluginStart;
  let getESQLAdHocDataview: typeof import('./get_esql_adhoc_dataview').getESQLAdHocDataview;

  beforeEach(async () => {
    dataViewsService = createMockDataViewsService();
    jest.restoreAllMocks();
    // Re-import the module to get a fresh timeFieldCache for each test
    jest.resetModules();
    ({ getESQLAdHocDataview } = await import('./get_esql_adhoc_dataview'));
  });

  describe('DataView ID', () => {
    it('should use options.id when provided instead of SHA-256', async () => {
      const result = await getESQLAdHocDataview({
        dataViewsService,
        query: uniqueQuery(),
        options: { id: 'my-custom-id' },
      });

      expect(dataViewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-custom-id' }),
        false
      );
      expect(result.id).toBe('my-custom-id');
    });

    it('should generate a deterministic SHA-256 ID when options.id is not provided', async () => {
      const query = uniqueQuery();
      const result1 = await getESQLAdHocDataview({ dataViewsService, query });
      const result2 = await getESQLAdHocDataview({ dataViewsService, query });

      expect(result1.id).toBe(result2.id);
      expect(typeof result1.id).toBe('string');
      expect((result1.id as string).length).toBe(64);
    });

    it('should use idPrefix for SHA-256 generation when options.id is not set', async () => {
      const query = uniqueQuery();
      const defaultResult = await getESQLAdHocDataview({ dataViewsService, query });
      const customResult = await getESQLAdHocDataview({
        dataViewsService,
        query,
        options: { idPrefix: 'custom' },
      });

      expect(defaultResult.id).not.toBe(customResult.id);
    });

    it('should ignore idPrefix when options.id is provided', async () => {
      const result = await getESQLAdHocDataview({
        dataViewsService,
        query: uniqueQuery(),
        options: { id: 'explicit-id', idPrefix: 'custom' },
      });

      expect(result.id).toBe('explicit-id');
    });
  });

  describe('DataView spec', () => {
    it('should create a DataView with ESQL_TYPE and extracted index pattern', async () => {
      await getESQLAdHocDataview({
        dataViewsService,
        query: 'FROM my_index | LIMIT 10',
      });

      expect(dataViewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'my_index',
          type: ESQL_TYPE,
        }),
        false
      );
    });

    it('should pass allowNoIndex when set', async () => {
      await getESQLAdHocDataview({
        dataViewsService,
        query: uniqueQuery(),
        options: { allowNoIndex: true },
      });

      expect(dataViewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ allowNoIndex: true }),
        false
      );
    });

    it('should skip fetching fields when skipFetchFields is true', async () => {
      await getESQLAdHocDataview({
        dataViewsService,
        query: uniqueQuery(),
        options: { skipFetchFields: true },
      });

      expect(dataViewsService.create).toHaveBeenCalledWith(expect.any(Object), true);
    });

    it('should fetch fields by default', async () => {
      await getESQLAdHocDataview({
        dataViewsService,
        query: uniqueQuery(),
      });

      expect(dataViewsService.create).toHaveBeenCalledWith(expect.any(Object), false);
    });
  });

  describe('time field detection', () => {
    it('should set timeFieldName when http returns a time field', async () => {
      const http = createMockHttp('@timestamp');
      const query = uniqueQuery();

      await getESQLAdHocDataview({ dataViewsService, query, http });

      expect(http.get).toHaveBeenCalledWith(`${TIMEFIELD_ROUTE}${encodeURIComponent(query)}`);
      expect(dataViewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ timeFieldName: '@timestamp' }),
        false
      );
    });

    it('should leave timeFieldName undefined when no http is provided', async () => {
      await getESQLAdHocDataview({
        dataViewsService,
        query: uniqueQuery(),
      });

      expect(dataViewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ timeFieldName: undefined }),
        false
      );
    });

    it('should leave timeFieldName undefined on HTTP failure', async () => {
      const http = {
        get: jest.fn().mockRejectedValue(new Error('network error')),
      } as unknown as HttpStart;
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await getESQLAdHocDataview({
        dataViewsService,
        query: uniqueQuery(),
        http,
      });

      expect(dataViewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ timeFieldName: undefined }),
        false
      );
    });
  });

  describe('timeFieldCache', () => {
    it('should not make a second HTTP call for the same query', async () => {
      const http = createMockHttp('@timestamp');
      const query = uniqueQuery();

      await getESQLAdHocDataview({ dataViewsService, query, http });
      await getESQLAdHocDataview({ dataViewsService, query, http });

      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('should make separate HTTP calls for different queries', async () => {
      const http = createMockHttp('@timestamp');

      await getESQLAdHocDataview({ dataViewsService, query: uniqueQuery('a'), http });
      await getESQLAdHocDataview({ dataViewsService, query: uniqueQuery('b'), http });

      expect(http.get).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate concurrent calls for the same query', async () => {
      let resolveHttp!: (value: unknown) => void;
      const httpPromise = new Promise((resolve) => {
        resolveHttp = resolve;
      });
      const http = {
        get: jest.fn(() => httpPromise),
      } as unknown as HttpStart;

      const query = uniqueQuery();
      const promise1 = getESQLAdHocDataview({ dataViewsService, query, http });
      const promise2 = getESQLAdHocDataview({ dataViewsService, query, http });

      resolveHttp({ timeField: '@timestamp' });

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(http.get).toHaveBeenCalledTimes(1);
      expect(result1.timeFieldName).toBe('@timestamp');
      expect(result2.timeFieldName).toBe('@timestamp');
    });

    it('should retry after HTTP failure', async () => {
      const http = {
        get: jest
          .fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValueOnce({ timeField: '@timestamp' }),
      } as unknown as HttpStart;
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const query = uniqueQuery();
      const result1 = await getESQLAdHocDataview({ dataViewsService, query, http });
      expect(result1.timeFieldName).toBeUndefined();

      const result2 = await getESQLAdHocDataview({ dataViewsService, query, http });
      expect(result2.timeFieldName).toBe('@timestamp');
      expect(http.get).toHaveBeenCalledTimes(2);
    });

    it('should evict the least recently used query after reaching the cache limit', async () => {
      const http = createMockHttp('@timestamp');
      const firstQuery = uniqueQuery('first');
      const recentQuery = uniqueQuery('recent');

      await getESQLAdHocDataview({ dataViewsService, query: firstQuery, http });
      await getESQLAdHocDataview({ dataViewsService, query: recentQuery, http });

      for (let i = 0; i < 98; i++) {
        await getESQLAdHocDataview({ dataViewsService, query: uniqueQuery(`fill_${i}`), http });
      }

      await getESQLAdHocDataview({ dataViewsService, query: recentQuery, http });
      await getESQLAdHocDataview({ dataViewsService, query: uniqueQuery('overflow'), http });
      await getESQLAdHocDataview({ dataViewsService, query: firstQuery, http });

      expect(http.get).toHaveBeenCalledTimes(102);
    });
  });

  describe('createNewInstanceEvenIfCachedOneAvailable', () => {
    it('should only clear the dataview instance cache', async () => {
      const http = createMockHttp('@timestamp');
      const query = uniqueQuery();

      await getESQLAdHocDataview({ dataViewsService, query, http });
      expect(http.get).toHaveBeenCalledTimes(1);

      await getESQLAdHocDataview({
        dataViewsService,
        query,
        http,
        options: { createNewInstanceEvenIfCachedOneAvailable: true },
      });

      expect(dataViewsService.clearInstanceCache).toHaveBeenCalled();
      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });
});
