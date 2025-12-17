/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerListRoute } from './route';
import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';

describe('registerListRoute', () => {
  const createMockRouter = () => {
    const mockVersionedRouter = {
      post: jest.fn().mockReturnThis(),
      addVersion: jest.fn().mockReturnThis(),
    };
    const mockRouter = {
      versioned: mockVersionedRouter,
      handleLegacyErrors: jest.fn((handler) => handler),
    } as unknown as IRouter;

    return { mockRouter, mockVersionedRouter };
  };

  const createMockLogger = (): jest.Mocked<Logger> => loggingSystemMock.createLogger();

  const createMockCoreSetup = () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

    // Mock getStartServices to return the coreStart.
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    return { coreSetup, coreStart };
  };

  describe('route registration', () => {
    it('should register a POST route at /internal/content_management/list', () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup } = createMockCoreSetup();

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      expect(mockVersionedRouter.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/content_management/list',
          access: 'internal',
        })
      );
    });

    it('should register version 1 of the route', () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup } = createMockCoreSetup();

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      expect(mockVersionedRouter.addVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1',
          validate: expect.objectContaining({
            request: expect.objectContaining({
              body: expect.anything(),
            }),
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('route handler', () => {
    const createMockContext = (
      overrides: {
        userId?: string;
        savedObjectsClient?: Record<string, jest.Mock>;
        typeRegistry?: Record<string, jest.Mock>;
      } = {}
    ) => {
      const { userId, savedObjectsClient, typeRegistry } = overrides;

      const mockSavedObjectsClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [], total: { value: 0 } },
        }),
        get: jest.fn(),
        getCurrentNamespace: jest.fn().mockReturnValue('default'),
        ...savedObjectsClient,
      };

      const mockTypeRegistry = {
        isSingleNamespace: jest.fn().mockReturnValue(false),
        ...typeRegistry,
      };

      return {
        core: Promise.resolve({
          security: {
            authc: {
              getCurrentUser: jest.fn().mockReturnValue(userId ? { profile_uid: userId } : null),
            },
          },
          savedObjects: {
            client: mockSavedObjectsClient,
            typeRegistry: mockTypeRegistry,
            getClient: jest.fn().mockReturnValue(mockSavedObjectsClient),
          },
        }),
      };
    };

    const createMockResponse = () => ({
      ok: jest.fn((data) => ({ body: data.body, status: 200 })),
      forbidden: jest.fn((data) => ({ body: data.body, status: 403 })),
    });

    it('should return empty results when no items match', async () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup, coreStart } = createMockCoreSetup();

      // Mock user profile bulkGet to return empty.
      coreStart.userProfile.bulkGet = jest.fn().mockResolvedValue([]);

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      // Get the handler from the addVersion call.
      const handler = mockVersionedRouter.addVersion.mock.calls[0][1];
      const mockContext = createMockContext();
      const mockRequest = {
        body: {
          type: 'dashboard',
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 10 },
        },
      };
      const mockResponse = createMockResponse();

      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          items: [],
          total: 0,
        }),
      });
    });

    it('should return forbidden when favoritesOnly is true but user has no profile_uid', async () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup } = createMockCoreSetup();

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      const handler = mockVersionedRouter.addVersion.mock.calls[0][1];
      const mockContext = createMockContext({ userId: undefined });
      const mockRequest = {
        body: {
          type: 'dashboard',
          favoritesOnly: true,
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 10 },
        },
      };
      const mockResponse = createMockResponse();

      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.forbidden).toHaveBeenCalledWith({
        body: { message: 'User identity required for favorites filtering' },
      });
    });

    it('should return empty results when favoritesOnly is true but user has no favorites', async () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup } = createMockCoreSetup();

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      const handler = mockVersionedRouter.addVersion.mock.calls[0][1];
      // Create a proper SavedObjects NotFoundError.
      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        'favorites',
        'dashboard:u_user_0'
      );
      const mockSavedObjectsClient = {
        search: jest.fn(),
        get: jest.fn().mockRejectedValue(notFoundError),
        getCurrentNamespace: jest.fn().mockReturnValue('default'),
      };
      const mockContext = createMockContext({
        userId: 'u_user_0',
        savedObjectsClient: mockSavedObjectsClient,
      });
      const mockRequest = {
        body: {
          type: 'dashboard',
          favoritesOnly: true,
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 10 },
        },
      };
      const mockResponse = createMockResponse();

      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { items: [], total: 0 },
      });
    });

    it('should transform results and return user info in users map', async () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup, coreStart } = createMockCoreSetup();

      // Mock user profile bulkGet to return user info.
      coreStart.userProfile.bulkGet = jest.fn().mockResolvedValue([
        {
          uid: 'u_creator_0',
          user: { username: 'creator', email: 'creator@example.com' },
          data: {},
        },
      ]);

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      const handler = mockVersionedRouter.addVersion.mock.calls[0][1];
      const mockSavedObjectsClient = {
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'dashboard:test-id',
                _source: {
                  type: 'dashboard',
                  dashboard: { title: 'Test Dashboard' },
                  created_by: 'u_creator_0',
                  references: [],
                },
              },
            ],
            total: { value: 1 },
          },
        }),
        getCurrentNamespace: jest.fn().mockReturnValue('default'),
      };
      const mockContext = createMockContext({
        savedObjectsClient: mockSavedObjectsClient,
      });
      const mockRequest = {
        body: {
          type: 'dashboard',
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 10 },
        },
      };
      const mockResponse = createMockResponse();

      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 'test-id',
              type: 'dashboard',
              createdBy: 'u_creator_0',
            }),
          ]),
          users: {
            u_creator_0: {
              username: 'creator',
              email: 'creator@example.com',
              fullName: undefined,
              avatar: undefined,
            },
          },
          total: 1,
        }),
      });
    });

    it('should resolve createdBy filter with usernames', async () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup, coreStart } = createMockCoreSetup();

      // Mock user profile bulkGet for resolution.
      coreStart.userProfile.bulkGet = jest.fn().mockResolvedValue([
        {
          uid: 'u_john_0',
          user: { username: 'john.doe', email: 'john@example.com' },
          data: {},
        },
      ]);

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      const handler = mockVersionedRouter.addVersion.mock.calls[0][1];
      const mockSavedObjectsClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [], total: { value: 0 } },
          aggregations: {
            unique_creators: {
              buckets: [{ key: 'u_john_0', doc_count: 1 }],
            },
          },
        }),
        getCurrentNamespace: jest.fn().mockReturnValue('default'),
      };
      const mockContext = createMockContext({
        savedObjectsClient: mockSavedObjectsClient,
      });
      const mockRequest = {
        body: {
          type: 'dashboard',
          createdBy: ['john.doe'],
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 10 },
        },
      };
      const mockResponse = createMockResponse();

      await handler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          resolvedFilters: {
            createdBy: { 'john.doe': 'u_john_0' },
          },
        }),
      });
    });

    it('should handle errors and log them', async () => {
      const { mockRouter, mockVersionedRouter } = createMockRouter();
      const mockLogger = createMockLogger();
      const { coreSetup } = createMockCoreSetup();

      registerListRoute({
        coreSetup: coreSetup as unknown as CoreSetup,
        router: mockRouter,
        logger: mockLogger,
      });

      const handler = mockVersionedRouter.addVersion.mock.calls[0][1];
      const mockError = new Error('Database connection failed');
      const mockSavedObjectsClient = {
        search: jest.fn().mockRejectedValue(mockError),
        getCurrentNamespace: jest.fn().mockReturnValue('default'),
      };
      const mockContext = createMockContext({
        savedObjectsClient: mockSavedObjectsClient,
      });
      const mockRequest = {
        body: {
          type: 'dashboard',
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 10 },
        },
      };
      const mockResponse = createMockResponse();

      await expect(handler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(mockError);
    });
  });
});
