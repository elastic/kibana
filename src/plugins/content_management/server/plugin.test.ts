/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import { ContentManagementPlugin } from './plugin';
import { IRouter } from '@kbn/core/server';
import { ProcedureName, procedureNames } from '../common';
import type { Context, ProcedureDefinition } from './rpc';

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
const mockCreate = jest.fn().mockResolvedValue('createMocked');
const mockUpdate = jest.fn().mockResolvedValue('updateMocked');
const mockDelete = jest.fn().mockResolvedValue('deleteMocked');
const mockSearch = jest.fn().mockResolvedValue('searchMocked');

jest.mock('./rpc/procedures/all_procedures', () => ({
  procedures: {
    get: {
      fn: (...args: unknown[]) => mockGet(...args),
      schemas: {
        in: {
          getSchema: () => ({
            validate: () => ({}),
          }),
        } as any,
      },
    },
    create: {
      fn: (...args: unknown[]) => mockCreate(...args),
      schemas: {
        in: {
          getSchema: () => ({
            validate: () => ({}),
          }),
        } as any,
      },
    },
    update: {
      fn: (...args: unknown[]) => mockUpdate(...args),
      schemas: {
        in: {
          getSchema: () => ({
            validate: () => ({}),
          }),
        } as any,
      },
    },
    delete: {
      fn: (...args: unknown[]) => mockDelete(...args),
      schemas: {
        in: {
          getSchema: () => ({
            validate: () => ({}),
          }),
        } as any,
      },
    },
    search: {
      fn: (...args: unknown[]) => mockSearch(...args),
      schemas: {
        in: {
          getSchema: () => ({
            validate: () => ({}),
          }),
        } as any,
      },
    },
  } as { [key in ProcedureName]: ProcedureDefinition<Context, any, any> },
}));

const setup = () => {
  const logger = loggingSystemMock.create();
  const { http } = coreMock.createSetup();

  const router: IRouter<any> = http.createRouter();
  router.post = jest.fn();

  const plugin = new ContentManagementPlugin({ logger });

  return { plugin, http: { createRouter: () => router }, router };
};

describe('ContentManagementPlugin', () => {
  describe('setup()', () => {
    test('should expose the core API', () => {
      const { plugin, http } = setup();
      const api = plugin.setup({ http });

      expect(Object.keys(api).sort()).toEqual(['crud', 'eventBus', 'register']);
      expect(api.crud('')).toBe('mockedCrud');
      expect(api.register({} as any)).toBe('mockedRegister');
      expect(api.eventBus.emit({} as any)).toBe('mockedEventBusEmit');
    });

    describe('RPC', () => {
      test('should create a single POST HTTP route on the router', () => {
        const { plugin, http, router } = setup();
        plugin.setup({ http });

        expect(router.post).toBeCalledTimes(1);
        const [routeConfig]: Parameters<IRouter['post']> = (router.post as jest.Mock).mock.calls[0];

        expect(routeConfig.path).toBe('/api/content_management/rpc/{name}');
      });

      test('should register all the procedures in the RPC service and the route handler must send to each procedure the core request context + the request body as input', async () => {
        const { plugin, http, router } = setup();
        plugin.setup({ http });

        const [_, handler]: Parameters<IRouter['post']> = (router.post as jest.Mock).mock.calls[0];

        const requestHandlerContext = { foo: 'bar' };
        const input = { testInput: 'baz' };

        const result = await Promise.all(
          procedureNames.map((name) => {
            return handler(
              requestHandlerContext as any,
              {
                params: { name },
                body: input,
              } as any,
              {
                ok: (response: { body: unknown }) => response.body,
              } as any
            );
          })
        );

        // Each procedure result is returned inside the response.ok() => body
        expect(result).toEqual(procedureNames.map((name) => ({ result: `${name}Mocked` })));

        // Each procedure has been called with the context and input
        const context = { requestHandlerContext, contentRegistry: 'mockedContentRegistry' };
        expect(mockGet).toHaveBeenCalledWith(context, input);
        expect(mockCreate).toHaveBeenCalledWith(context, input);
        expect(mockUpdate).toHaveBeenCalledWith(context, input);
        expect(mockDelete).toHaveBeenCalledWith(context, input);
        expect(mockSearch).toHaveBeenCalledWith(context, input);
      });
    });
  });
});
