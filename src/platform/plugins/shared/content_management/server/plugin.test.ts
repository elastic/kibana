/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ContentManagementPlugin } from './plugin';
import type { IRouter } from '@kbn/core-http-server';
import type { ProcedureName } from '../common';
import { procedureNames } from '../common/rpc';
import { MSearchService } from './core/msearch';

jest.mock('./core', () => ({
  ...jest.requireActual('./core'),
  Core: class {
    setup() {
      return {
        contentRegistry: 'mockedContentRegistry',
        api: {
          register: jest.fn().mockReturnValue('mockedRegister'),
          crud: jest.fn().mockReturnValue('mockedCrud'),
          eventBus: {
            emit: jest.fn().mockReturnValue('mockedEventBusEmit'),
          },
        },
      };
    }
  },
}));

const mockGet = jest.fn().mockResolvedValue('getMocked');
const mockBulkGet = jest.fn().mockResolvedValue('bulkGetMocked');
const mockCreate = jest.fn().mockResolvedValue('createMocked');
const mockUpdate = jest.fn().mockResolvedValue('updateMocked');
const mockDelete = jest.fn().mockResolvedValue('deleteMocked');
const mockSearch = jest.fn().mockResolvedValue('searchMocked');
const mockMSearch = jest.fn().mockResolvedValue('mSearchMocked');

jest.mock('./rpc/procedures/all_procedures', () => {
  const mockedProcedure = (spyGetter: () => jest.Mock) => ({
    fn: (...args: unknown[]) => spyGetter()(...args),
    schemas: {
      in: {
        validate: () => undefined,
      } as any,
    },
  });

  const mockedProcedures: { [key in ProcedureName]: any } = {
    get: mockedProcedure(() => mockGet),
    bulkGet: mockedProcedure(() => mockBulkGet),
    create: mockedProcedure(() => mockCreate),
    update: mockedProcedure(() => mockUpdate),
    delete: mockedProcedure(() => mockDelete),
    search: mockedProcedure(() => mockSearch),
    mSearch: mockedProcedure(() => mockMSearch),
  };

  return {
    procedures: mockedProcedures,
  };
});

const setup = () => {
  const coreSetup = coreMock.createSetup();
  const router: IRouter<any> = coreSetup.http.createRouter();
  const http = { ...coreSetup.http, createRouter: () => router };
  const plugin = new ContentManagementPlugin(coreMock.createPluginInitializerContext());

  router.post = jest.fn();

  return {
    plugin,
    http,
    router,
    coreSetup: {
      ...coreSetup,
      http,
    },
    pluginsSetup: {},
  };
};

describe('ContentManagementPlugin', () => {
  describe('setup()', () => {
    test('should expose the core API', () => {
      const { plugin, coreSetup, pluginsSetup } = setup();
      const api = plugin.setup(coreSetup, pluginsSetup);

      expect(Object.keys(api).sort()).toEqual(['crud', 'eventBus', 'favorites', 'register']);
      expect(api.crud('')).toBe('mockedCrud');
      expect(api.register({} as any)).toBe('mockedRegister');
      expect(api.eventBus.emit({} as any)).toBe('mockedEventBusEmit');
    });

    describe('RPC', () => {
      test('should create a rpc POST HTTP route on the router', () => {
        const { plugin, coreSetup, router, pluginsSetup } = setup();
        plugin.setup(coreSetup, pluginsSetup);

        const [routeConfig]: Parameters<IRouter['post']> = (router.post as jest.Mock).mock.calls[0];

        expect(routeConfig.path).toBe('/api/content_management/rpc/{name}');
      });

      test('should register all the procedures in the RPC service and the route handler must send to each procedure the core request context + the request body as input', async () => {
        const { plugin, coreSetup, router, pluginsSetup } = setup();
        plugin.setup(coreSetup, pluginsSetup);

        const [_, handler]: Parameters<IRouter['post']> = (router.post as jest.Mock).mock.calls[0];

        const mockedRequestHandlerContext: any = { foo: 'bar' };
        const mockedResponse: any = {
          ok: jest.fn((data: { body: unknown }) => data.body),
          customError: jest.fn((e: any) => e),
        };

        const input = { testInput: 'baz' };

        // Call the handler for each of our procedure names
        const result = await Promise.all(
          procedureNames.map((name) => {
            const mockedRequest: any = {
              params: { name },
              body: input,
            };

            return handler(mockedRequestHandlerContext, mockedRequest, mockedResponse);
          })
        );

        // Each procedure result is returned inside the response.ok() => body
        expect(result).toEqual(procedureNames.map((name) => ({ result: `${name}Mocked` })));

        // Each procedure has been called with the context and input
        const context = {
          requestHandlerContext: mockedRequestHandlerContext,
          request: expect.any(Object),
          contentRegistry: 'mockedContentRegistry',
          mSearchService: expect.any(MSearchService),
        };
        expect(mockGet).toHaveBeenCalledWith(context, input);
        expect(mockCreate).toHaveBeenCalledWith(context, input);
        expect(mockUpdate).toHaveBeenCalledWith(context, input);
        expect(mockDelete).toHaveBeenCalledWith(context, input);
        expect(mockSearch).toHaveBeenCalledWith(context, input);
        expect(mockMSearch).toHaveBeenCalledWith(context, input);
      });

      test('should return error in custom error format', async () => {
        const { plugin, coreSetup, router, pluginsSetup } = setup();
        plugin.setup(coreSetup, pluginsSetup);

        const [_, handler]: Parameters<IRouter['post']> = (router.post as jest.Mock).mock.calls[0];

        // const mockedRequestHandlerContext: any = { foo: 'bar' };
        const mockedResponse: any = {
          ok: jest.fn((response: { body: unknown }) => response.body),
          customError: jest.fn((e: any) => e),
        };

        mockGet.mockRejectedValueOnce(new Error('Houston we got a problem.'));
        const error = await handler({} as any, { params: { name: 'get' } } as any, mockedResponse);

        expect(error).toEqual({
          body: {
            message: new Error('Houston we got a problem.'),
          },
          headers: {},
          statusCode: 500,
        });
      });
    });
  });
});
