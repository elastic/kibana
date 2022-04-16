/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart, SavedObject } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';

import { DataPluginStart, DataPluginStartDependencies } from '../plugin';
import { createFieldFormatsStartMock } from '@kbn/field-formats-plugin/server/mocks';
import { createIndexPatternsStartMock } from '../data_views/mocks';

import { SearchService, SearchServiceSetupDependencies } from './search_service';
import { bfetchPluginMock } from '@kbn/bfetch-plugin/server/mocks';
import { lastValueFrom, of } from 'rxjs';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
  IScopedSearchClient,
  IScopedSearchSessionsClient,
  ISearchSessionService,
  ISearchStart,
  ISearchStrategy,
} from '.';
import { NoSearchIdInSessionError } from '.';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { createSearchSessionsClientMock } from './mocks';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../common';

describe('Search service', () => {
  let plugin: SearchService;
  let mockCoreSetup: MockedKeys<CoreSetup<DataPluginStartDependencies, DataPluginStart>>;
  let mockCoreStart: MockedKeys<CoreStart>;

  beforeEach(() => {
    const context = coreMock.createPluginInitializerContext({});
    const mockLogger = context.logger.get();
    context.config.create = jest.fn().mockImplementation(() => {
      return of({
        search: {
          aggs: {
            shardDelay: {
              enabled: true,
            },
          },
        },
      });
    });
    plugin = new SearchService(context, mockLogger);
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const bfetch = bfetchPluginMock.createSetupContract();
      const setup = plugin.setup(mockCoreSetup, {
        packageInfo: { version: '8' },
        bfetch,
        expressions: {
          registerFunction: jest.fn(),
          registerType: jest.fn(),
        },
      } as unknown as SearchServiceSetupDependencies);
      expect(setup).toHaveProperty('aggs');
      expect(setup).toHaveProperty('registerSearchStrategy');
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      const start = plugin.start(mockCoreStart, {
        fieldFormats: createFieldFormatsStartMock(),
        indexPatterns: createIndexPatternsStartMock(),
      });
      expect(start).toHaveProperty('aggs');
      expect(start).toHaveProperty('getSearchStrategy');
    });
  });

  describe('asScopedProvider', () => {
    let mockScopedClient: IScopedSearchClient;
    let searchPluginStart: ISearchStart<IEsSearchRequest, IEsSearchResponse<any>>;
    let mockStrategy: any;
    let mockStrategyNoCancel: jest.Mocked<ISearchStrategy>;
    let mockSessionService: ISearchSessionService<any>;
    let mockSessionClient: jest.Mocked<IScopedSearchSessionsClient>;
    const sessionId = '1234';

    beforeEach(() => {
      mockStrategy = {
        search: jest.fn().mockReturnValue(of({})),
        cancel: jest.fn(),
        extend: jest.fn(),
      };

      mockStrategyNoCancel = {
        search: jest.fn().mockReturnValue(of({})),
      };

      mockSessionClient = createSearchSessionsClientMock();
      mockSessionService = {
        asScopedProvider: () => (request: any) => mockSessionClient,
      };

      const pluginSetup = plugin.setup(mockCoreSetup, {
        bfetch: bfetchPluginMock.createSetupContract(),
        expressions: expressionsPluginMock.createSetupContract(),
      });
      pluginSetup.registerSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY, mockStrategy);
      pluginSetup.registerSearchStrategy('nocancel', mockStrategyNoCancel);
      pluginSetup.__enhance({
        sessionService: mockSessionService,
      });

      searchPluginStart = plugin.start(mockCoreStart, {
        fieldFormats: createFieldFormatsStartMock(),
        indexPatterns: createIndexPatternsStartMock(),
      });

      const r: any = {};

      mockScopedClient = searchPluginStart.asScoped(r);
    });

    describe('search', () => {
      it('searches using the original request if not restoring, trackId is not called if there is no id in the response', async () => {
        const searchRequest = { params: {} };
        const options = { sessionId, isStored: false, isRestore: false };
        mockSessionClient.trackId = jest.fn().mockResolvedValue(undefined);

        mockStrategy.search.mockReturnValue(
          of({
            rawResponse: {} as any,
          })
        );

        await mockScopedClient.search(searchRequest, options).toPromise();

        const [request, callOptions] = mockStrategy.search.mock.calls[0];

        expect(callOptions).toBe(options);
        expect(request).toBe(searchRequest);
        expect(mockSessionClient.trackId).not.toBeCalled();
      });

      it('searches using the original request if `id` is provided', async () => {
        const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
        const searchRequest = { id: searchId, params: {} };
        const options = { sessionId, isStored: true, isRestore: true };

        await mockScopedClient.search(searchRequest, options).toPromise();

        const [request, callOptions] = mockStrategy.search.mock.calls[0];
        expect(callOptions).toBe(options);
        expect(request).toBe(searchRequest);
      });

      it('searches by looking up an `id` if restoring and `id` is not provided', async () => {
        const searchRequest = { params: {} };
        const options = { sessionId, isStored: true, isRestore: true };

        mockSessionClient.getId = jest.fn().mockResolvedValueOnce('my_id');

        await mockScopedClient.search(searchRequest, options).toPromise();

        const [request, callOptions] = mockStrategy.search.mock.calls[0];
        expect(callOptions).toBe(options);
        expect(request).toStrictEqual({ ...searchRequest, id: 'my_id' });
      });

      it('searches even if id is not found in session during restore', async () => {
        const searchRequest = { params: {} };
        const options = { sessionId, isStored: true, isRestore: true };

        mockSessionClient.getId = jest.fn().mockImplementation(() => {
          throw new NoSearchIdInSessionError();
        });

        const res = await lastValueFrom(mockScopedClient.search(searchRequest, options));

        const [request, callOptions] = mockStrategy.search.mock.calls[0];
        expect(callOptions).toBe(options);
        expect(request).toStrictEqual({ ...searchRequest });
        expect(res.isRestored).toBe(false);
      });

      it('does not fail if `trackId` throws', async () => {
        const searchRequest = { params: {} };
        const options = { sessionId, isStored: false, isRestore: false };
        mockSessionClient.trackId = jest.fn().mockRejectedValue(undefined);

        mockStrategy.search.mockReturnValue(
          of({
            id: 'my_id',
            rawResponse: {} as any,
          })
        );

        await mockScopedClient.search(searchRequest, options).toPromise();

        expect(mockSessionClient.trackId).toBeCalledTimes(1);
      });

      it('calls `trackId` for every response, if the response contains an `id` and not restoring', async () => {
        const searchRequest = { params: {} };
        const options = { sessionId, isStored: false, isRestore: false };
        mockSessionClient.trackId = jest.fn().mockResolvedValue(undefined);

        mockStrategy.search.mockReturnValue(
          of(
            {
              id: 'my_id',
              rawResponse: {} as any,
            },
            {
              id: 'my_id',
              rawResponse: {} as any,
            }
          )
        );

        await mockScopedClient.search(searchRequest, options).toPromise();

        expect(mockSessionClient.trackId).toBeCalledTimes(2);

        expect(mockSessionClient.trackId.mock.calls[0]).toEqual([searchRequest, 'my_id', options]);
        expect(mockSessionClient.trackId.mock.calls[1]).toEqual([searchRequest, 'my_id', options]);
      });

      it('does not call `trackId` if restoring', async () => {
        const searchRequest = { params: {} };
        const options = { sessionId, isStored: true, isRestore: true };
        mockSessionClient.getId = jest.fn().mockResolvedValueOnce('my_id');
        mockSessionClient.trackId = jest.fn().mockResolvedValue(undefined);

        await mockScopedClient.search(searchRequest, options).toPromise();

        expect(mockSessionClient.trackId).not.toBeCalled();
      });

      it('does not call `trackId` if no session id provided', async () => {
        const searchRequest = { params: {} };
        const options = {};
        mockSessionClient.getId = jest.fn().mockResolvedValueOnce('my_id');
        mockSessionClient.trackId = jest.fn().mockResolvedValue(undefined);

        await mockScopedClient.search(searchRequest, options).toPromise();

        expect(mockSessionClient.trackId).not.toBeCalled();
      });
    });

    describe('cancelSession', () => {
      const mockSavedObject: SavedObject = {
        id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
        type: 'search-session',
        attributes: {
          name: 'my_name',
          appId: 'my_app_id',
          urlGeneratorId: 'my_url_generator_id',
          idMapping: {},
        },
        references: [],
      };

      it('cancels a saved object with no search ids', async () => {
        mockSessionClient.getSearchIdMapping = jest
          .fn()
          .mockResolvedValue(new Map<string, string>());
        mockSessionClient.cancel = jest.fn().mockResolvedValue(mockSavedObject);
        const cancelSpy = jest.spyOn(mockScopedClient, 'cancel');

        await mockScopedClient.cancelSession('123');

        expect(mockSessionClient.cancel).toHaveBeenCalledTimes(1);
        expect(cancelSpy).not.toHaveBeenCalled();
      });

      it('cancels a saved object and search ids', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockStrategy.cancel = jest.fn();
        mockSessionClient.cancel = jest.fn().mockResolvedValue(mockSavedObject);

        await mockScopedClient.cancelSession('123');

        expect(mockSessionClient.cancel).toHaveBeenCalledTimes(1);

        const [searchId, options] = mockStrategy.cancel.mock.calls[0];
        expect(mockStrategy.cancel).toHaveBeenCalledTimes(1);
        expect(searchId).toBe('abc');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });

      it('cancels a saved object with some strategies that dont support cancellation, dont throw an error', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', 'nocancel');
        mockMap.set('def', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockStrategy.cancel = jest.fn();
        mockSessionClient.cancel = jest.fn().mockResolvedValue(mockSavedObject);

        await mockScopedClient.cancelSession('123');

        expect(mockSessionClient.cancel).toHaveBeenCalledTimes(1);

        const [searchId, options] = mockStrategy.cancel.mock.calls[0];
        expect(mockStrategy.cancel).toHaveBeenCalledTimes(1);
        expect(searchId).toBe('def');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });

      it('cancels a saved object with some strategies that dont exist, dont throw an error', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', 'notsupported');
        mockMap.set('def', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockStrategy.cancel = jest.fn();
        mockSessionClient.cancel = jest.fn().mockResolvedValue(mockSavedObject);

        await mockScopedClient.cancelSession('123');

        expect(mockSessionClient.cancel).toHaveBeenCalledTimes(1);

        const [searchId, options] = mockStrategy.cancel.mock.calls[0];
        expect(mockStrategy.cancel).toHaveBeenCalledTimes(1);
        expect(searchId).toBe('def');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });
    });

    describe('deleteSession', () => {
      const mockSavedObject: SavedObject = {
        id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
        type: 'search-session',
        attributes: {
          name: 'my_name',
          appId: 'my_app_id',
          urlGeneratorId: 'my_url_generator_id',
          idMapping: {},
        },
        references: [],
      };

      it('deletes a saved object with no search ids', async () => {
        mockSessionClient.getSearchIdMapping = jest
          .fn()
          .mockResolvedValue(new Map<string, string>());
        mockSessionClient.delete = jest.fn().mockResolvedValue(mockSavedObject);
        const cancelSpy = jest.spyOn(mockScopedClient, 'cancel');

        await mockScopedClient.deleteSession('123');

        expect(mockSessionClient.delete).toHaveBeenCalledTimes(1);
        expect(cancelSpy).not.toHaveBeenCalled();
      });

      it('deletes a saved object and search ids', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockSessionClient.delete = jest.fn().mockResolvedValue(mockSavedObject);
        mockStrategy.cancel = jest.fn();

        await mockScopedClient.deleteSession('123');

        expect(mockSessionClient.delete).toHaveBeenCalledTimes(1);

        const [searchId, options] = mockStrategy.cancel.mock.calls[0];
        expect(mockStrategy.cancel).toHaveBeenCalledTimes(1);
        expect(searchId).toBe('abc');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });

      it('deletes a saved object with some strategies that dont support cancellation, dont throw an error', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', 'nocancel');
        mockMap.set('def', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockSessionClient.delete = jest.fn().mockResolvedValue(mockSavedObject);
        mockStrategy.cancel = jest.fn();

        await mockScopedClient.deleteSession('123');

        expect(mockSessionClient.delete).toHaveBeenCalledTimes(1);

        const [searchId, options] = mockStrategy.cancel.mock.calls[0];
        expect(mockStrategy.cancel).toHaveBeenCalledTimes(1);
        expect(searchId).toBe('def');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });

      it('deletes a saved object with some strategies that dont exist, dont throw an error', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', 'notsupported');
        mockMap.set('def', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockStrategy.cancel = jest.fn();
        mockSessionClient.delete = jest.fn().mockResolvedValue(mockSavedObject);

        await mockScopedClient.deleteSession('123');

        expect(mockSessionClient.delete).toHaveBeenCalledTimes(1);

        const [searchId, options] = mockStrategy.cancel.mock.calls[0];
        expect(mockStrategy.cancel).toHaveBeenCalledTimes(1);
        expect(searchId).toBe('def');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });
    });

    describe('extendSession', () => {
      const mockSavedObject: SavedObject = {
        id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
        type: 'search-session',
        attributes: {
          name: 'my_name',
          appId: 'my_app_id',
          urlGeneratorId: 'my_url_generator_id',
          idMapping: {},
        },
        references: [],
      };

      it('extends a saved object with no search ids', async () => {
        mockSessionClient.getSearchIdMapping = jest
          .fn()
          .mockResolvedValue(new Map<string, string>());
        mockSessionClient.extend = jest.fn().mockResolvedValue(mockSavedObject);
        mockStrategy.extend = jest.fn();

        await mockScopedClient.extendSession('123', new Date('2020-01-01'));

        expect(mockSessionClient.extend).toHaveBeenCalledTimes(1);
        expect(mockStrategy.extend).not.toHaveBeenCalled();
      });

      it('extends a saved object and search ids', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockSessionClient.extend = jest.fn().mockResolvedValue(mockSavedObject);
        mockStrategy.extend = jest.fn();

        await mockScopedClient.extendSession('123', new Date('2020-01-01'));

        expect(mockSessionClient.extend).toHaveBeenCalledTimes(1);
        expect(mockStrategy.extend).toHaveBeenCalledTimes(1);
        const [searchId, keepAlive, options] = mockStrategy.extend.mock.calls[0];
        expect(searchId).toBe('abc');
        expect(keepAlive).toContain('ms');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });

      it('doesnt extend the saved object with some strategies that dont support cancellation, throws an error', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', 'nocancel');
        mockMap.set('def', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockSessionClient.extend = jest.fn().mockResolvedValue(mockSavedObject);
        mockStrategy.extend = jest.fn().mockResolvedValue({});

        const extendRes = mockScopedClient.extendSession('123', new Date('2020-01-01'));

        await expect(extendRes).rejects.toThrowError(
          'Failed to extend the expiration of some searches'
        );

        expect(mockSessionClient.extend).not.toHaveBeenCalled();
        const [searchId, keepAlive, options] = mockStrategy.extend.mock.calls[0];
        expect(searchId).toBe('def');
        expect(keepAlive).toContain('ms');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });

      it('doesnt extend the saved object with some strategies that dont exist, throws an error', async () => {
        const mockMap = new Map<string, string>();
        mockMap.set('abc', 'notsupported');
        mockMap.set('def', ENHANCED_ES_SEARCH_STRATEGY);
        mockSessionClient.getSearchIdMapping = jest.fn().mockResolvedValue(mockMap);
        mockSessionClient.extend = jest.fn().mockResolvedValue(mockSavedObject);
        mockStrategy.extend = jest.fn().mockResolvedValue({});

        const extendRes = mockScopedClient.extendSession('123', new Date('2020-01-01'));

        await expect(extendRes).rejects.toThrowError(
          'Failed to extend the expiration of some searches'
        );

        expect(mockSessionClient.extend).not.toHaveBeenCalled();
        const [searchId, keepAlive, options] = mockStrategy.extend.mock.calls[0];
        expect(searchId).toBe('def');
        expect(keepAlive).toContain('ms');
        expect(options).toHaveProperty('strategy', ENHANCED_ES_SEARCH_STRATEGY);
      });
    });
  });
});
