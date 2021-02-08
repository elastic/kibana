/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from '../../../../core/server';
import { coreMock } from '../../../../core/server/mocks';

import { DataPluginStart } from '../plugin';
import { createFieldFormatsStartMock } from '../field_formats/mocks';
import { createIndexPatternsStartMock } from '../index_patterns/mocks';

import { SearchService, SearchServiceSetupDependencies } from './search_service';
import { bfetchPluginMock } from '../../../bfetch/server/mocks';
import { of } from 'rxjs';
import {
  IEsSearchRequest,
  IEsSearchResponse,
  IScopedSearchClient,
  IScopedSearchSessionsClient,
  ISearchSessionService,
  ISearchStart,
  ISearchStrategy,
} from '.';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { expressionsPluginMock } from '../../../expressions/public/mocks';
import { createSearchSessionsClientMock } from './mocks';

describe('Search service', () => {
  let plugin: SearchService;
  let mockCoreSetup: MockedKeys<CoreSetup<object, DataPluginStart>>;
  let mockCoreStart: MockedKeys<CoreStart>;

  beforeEach(() => {
    const mockLogger: any = {
      debug: () => {},
    };
    const context = coreMock.createPluginInitializerContext({});
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
      const setup = plugin.setup(mockCoreSetup, ({
        packageInfo: { version: '8' },
        bfetch,
        expressions: {
          registerFunction: jest.fn(),
          registerType: jest.fn(),
        },
      } as unknown) as SearchServiceSetupDependencies);
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
    let searcPluginStart: ISearchStart<IEsSearchRequest, IEsSearchResponse<any>>;
    let mockStrategy: jest.Mocked<ISearchStrategy>;
    let mockSessionService: ISearchSessionService<any>;
    let mockSessionClient: jest.Mocked<IScopedSearchSessionsClient>;
    const sessionId = '1234';

    beforeEach(() => {
      mockStrategy = { search: jest.fn().mockReturnValue(of({})) };

      mockSessionClient = createSearchSessionsClientMock();
      mockSessionService = {
        asScopedProvider: () => (request: any) => mockSessionClient,
      };

      const pluginSetup = plugin.setup(mockCoreSetup, {
        bfetch: bfetchPluginMock.createSetupContract(),
        expressions: expressionsPluginMock.createSetupContract(),
      });
      pluginSetup.registerSearchStrategy('es', mockStrategy);
      pluginSetup.__enhance({
        defaultStrategy: 'es',
        sessionService: mockSessionService,
      });

      searcPluginStart = plugin.start(mockCoreStart, {
        fieldFormats: createFieldFormatsStartMock(),
        indexPatterns: createIndexPatternsStartMock(),
      });

      const r: any = {};

      mockScopedClient = searcPluginStart.asScoped(r);
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
  });
});
