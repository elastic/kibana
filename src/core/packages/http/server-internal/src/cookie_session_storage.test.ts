/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import type { SessionStorageCookieOptions } from '@kbn/core-http-server';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { createCookieSessionStorageFactory } from './cookie_session_storage';

describe('createCookieSessionStorageFactory', () => {
  let mockServer: {
    register: jest.Mock;
    auth: {
      strategy: jest.Mock;
      test: jest.Mock;
    };
  };
  let mockLogger: ReturnType<typeof loggingSystemMock.create>;

  const defaultCookieOptions: SessionStorageCookieOptions<any> = {
    name: 'test-cookie',
    encryptionKey: 'a'.repeat(32),
    validate: jest.fn(() => ({ isValid: true })),
    isSecure: false,
  };

  beforeEach(() => {
    mockServer = {
      register: jest.fn(),
      auth: {
        strategy: jest.fn(),
        test: jest.fn(),
      },
    } as any;

    mockLogger = loggingSystemMock.create();
  });

  describe('factory creation', () => {
    it('should register hapi cookie plugin', async () => {
      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        defaultCookieOptions,
        false
      );

      expect(mockServer.register).toHaveBeenCalledTimes(1);
      expect(mockServer.register).toHaveBeenCalledWith({ plugin: expect.any(Object) });
    });

    it('should configure auth strategy with correct options', async () => {
      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        defaultCookieOptions,
        false
      );

      expect(mockServer.auth.strategy).toHaveBeenCalledTimes(1);
      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'security-cookie',
        'cookie',
        expect.objectContaining({
          cookie: expect.objectContaining({
            name: 'test-cookie',
            password: 'a'.repeat(32),
            isSecure: false,
            path: '/',
            clearInvalid: false,
            isHttpOnly: true,
            isSameSite: false,
            isPartitioned: false,
          }),
          validate: expect.any(Function),
        })
      );
    });

    it('should configure auth strategy with custom basePath', async () => {
      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        defaultCookieOptions,
        false,
        '/custom-base'
      );

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'security-cookie',
        'cookie',
        expect.objectContaining({
          cookie: expect.objectContaining({
            path: '/custom-base',
          }),
        })
      );
    });

    it('should configure auth strategy with sameSite option', async () => {
      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        {
          ...defaultCookieOptions,
          sameSite: 'Strict',
        },
        false
      );

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'security-cookie',
        'cookie',
        expect.objectContaining({
          cookie: expect.objectContaining({
            isSameSite: 'Strict',
          }),
        })
      );
    });

    it('should enable partitioned cookies when sameSite=None, secure, and embedding enabled', async () => {
      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        {
          ...defaultCookieOptions,
          sameSite: 'None',
          isSecure: true,
        },
        false // disableEmbedding = false means embedding is enabled
      );

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'security-cookie',
        'cookie',
        expect.objectContaining({
          cookie: expect.objectContaining({
            isPartitioned: true,
          }),
        })
      );
    });

    it('should not enable partitioned cookies when embedding is disabled', async () => {
      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        {
          ...defaultCookieOptions,
          sameSite: 'None',
          isSecure: true,
        },
        true // disableEmbedding = true
      );

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'security-cookie',
        'cookie',
        expect.objectContaining({
          cookie: expect.objectContaining({
            isPartitioned: false,
          }),
        })
      );
    });

    it('should throw error when sameSite=None without secure connection', async () => {
      await expect(
        createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          {
            ...defaultCookieOptions,
            sameSite: 'None',
            isSecure: false,
          },
          false
        )
      ).rejects.toThrow('"SameSite: None" requires Secure connection');
    });
  });

  describe('validate callback', () => {
    it('should call user validate function and return result', async () => {
      const validateFn = jest.fn(() => ({ isValid: true }));

      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        {
          ...defaultCookieOptions,
          validate: validateFn,
        },
        false
      );

      const strategyConfig = mockServer.auth.strategy.mock.calls[0][2] as any;
      const mockRequest = {} as Request;
      const session = { value: 'test' };

      const result = await strategyConfig.validate(mockRequest, session);

      expect(validateFn).toHaveBeenCalledWith(session);
      expect(result).toEqual({ isValid: true });
    });

    it('should clear invalid cookie when validation fails', async () => {
      const validateFn = jest.fn(() => ({ isValid: false, path: '/custom' }));
      const mockRequest = {
        cookieAuth: {
          h: {
            unstate: jest.fn(),
          },
        },
      } as any;

      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        {
          ...defaultCookieOptions,
          validate: validateFn,
        },
        false
      );

      const strategyConfig = mockServer.auth.strategy.mock.calls[0][2] as any;
      const session = { value: 'test' };

      await strategyConfig.validate(mockRequest, session);

      expect(mockRequest.cookieAuth.h.unstate).toHaveBeenCalledWith('test-cookie', {
        path: '/custom',
      });
      expect(loggingSystemMock.collect(mockLogger).debug).toEqual([
        ['Clearing invalid session cookie'],
      ]);
    });

    it('should use basePath when clearing invalid cookie without path in validation result', async () => {
      const validateFn = jest.fn(() => ({ isValid: false }));
      const mockRequest = {
        cookieAuth: {
          h: {
            unstate: jest.fn(),
          },
        },
      } as any;

      await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        {
          ...defaultCookieOptions,
          validate: validateFn,
        },
        false,
        '/my-base'
      );

      const strategyConfig = mockServer.auth.strategy.mock.calls[0][2] as any;
      const session = { value: 'test' };

      await strategyConfig.validate(mockRequest, session);

      expect(mockRequest.cookieAuth.h.unstate).toHaveBeenCalledWith('test-cookie', {
        path: '/my-base',
      });
    });
  });

  describe('asScoped', () => {
    it('should return a scoped session storage', async () => {
      const factory = await createCookieSessionStorageFactory(
        mockLogger.get(),
        mockServer as any,
        defaultCookieOptions,
        false
      );

      const mockRequest = mockRouter.createKibanaRequest();
      const scopedStorage = factory.asScoped(mockRequest);

      expect(scopedStorage).toHaveProperty('get');
      expect(scopedStorage).toHaveProperty('set');
      expect(scopedStorage).toHaveProperty('clear');
    });
  });

  describe('ScopedCookieSessionStorage', () => {
    describe('get()', () => {
      it('should return session value when auth test succeeds', async () => {
        const sessionData = { userId: '123' };
        mockServer.auth.test = jest.fn().mockResolvedValue({
          credentials: sessionData,
        });

        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const session = await factory.asScoped(mockRequest).get();

        expect(session).toEqual(sessionData);
        expect(mockServer.auth.test).toHaveBeenCalledWith(
          'security-cookie',
          ensureRawRequest(mockRequest)
        );
      });

      it('should return first session when credentials is array with one element', async () => {
        const sessionData = { userId: '123' };
        mockServer.auth.test = jest.fn().mockResolvedValue({
          credentials: [sessionData],
        });

        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const session = await factory.asScoped(mockRequest).get();

        expect(session).toEqual(sessionData);
      });

      it('should return first session when multiple equal sessions are found', async () => {
        const sessionData = { userId: '123' };
        mockServer.auth.test = jest.fn().mockResolvedValue({
          credentials: [sessionData, sessionData],
        });

        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const session = await factory.asScoped(mockRequest).get();

        expect(session).toEqual(sessionData);
        expect(loggingSystemMock.collect(mockLogger).warn).toEqual([
          ['Found multiple auth sessions. Found:[2] sessions. Checking equality...'],
        ]);
        expect(loggingSystemMock.collect(mockLogger).error).toEqual([
          ['Found multiple auth sessions. Found:[2] equal sessions'],
        ]);
      });

      it('should return null when multiple unequal sessions are found', async () => {
        const session1 = { userId: '123' };
        const session2 = { userId: '456' };
        mockServer.auth.test = jest.fn().mockResolvedValue({
          credentials: [session1, session2],
        });

        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const session = await factory.asScoped(mockRequest).get();

        expect(session).toBeNull();
        expect(loggingSystemMock.collect(mockLogger).warn).toEqual([
          ['Found multiple auth sessions. Found:[2] sessions. Checking equality...'],
        ]);
        expect(loggingSystemMock.collect(mockLogger).error).toEqual([
          ['Found multiple auth sessions. Found:[2] unequal sessions'],
        ]);
      });

      it('should return null when auth test throws error', async () => {
        mockServer.auth.test = jest.fn().mockRejectedValue(new Error('Auth failed'));

        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const session = await factory.asScoped(mockRequest).get();

        expect(session).toBeNull();
        expect(loggingSystemMock.collect(mockLogger).debug).toEqual([['Error: Auth failed']]);
      });
    });

    describe('set()', () => {
      it('should set session using default cookie auth', async () => {
        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const rawRequest = ensureRawRequest(mockRequest);
        const mockSet = jest.fn();
        (rawRequest as any).cookieAuth = { set: mockSet };

        const sessionData = { userId: '123' };
        factory.asScoped(mockRequest).set(sessionData);

        expect(mockSet).toHaveBeenCalledWith(sessionData);
      });

      it('should set session with custom cookie options', async () => {
        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const rawRequest = ensureRawRequest(mockRequest);
        const mockState = jest.fn();
        (rawRequest as any).cookieAuth = {
          h: { state: mockState },
          set: jest.fn(),
        };

        const sessionData = { userId: '123' };
        const options = { isSecure: true, sameSite: 'Strict' as const };
        factory.asScoped(mockRequest).set(sessionData, options);

        expect(mockState).toHaveBeenCalledWith('test-cookie', sessionData, {
          isSecure: true,
          isSameSite: 'Strict',
        });
      });

      it('should use default cookie options when only partial options provided', async () => {
        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          {
            ...defaultCookieOptions,
            isSecure: true,
            sameSite: 'Lax',
          },
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const rawRequest = ensureRawRequest(mockRequest);
        const mockState = jest.fn();
        (rawRequest as any).cookieAuth = {
          h: { state: mockState },
          set: jest.fn(),
        };

        const sessionData = { userId: '123' };
        const options = { isSecure: false }; // Only override isSecure
        factory.asScoped(mockRequest).set(sessionData, options);

        expect(mockState).toHaveBeenCalledWith('test-cookie', sessionData, {
          isSecure: false,
          isSameSite: 'Lax', // Should use default from cookieOptions
        });
      });
    });

    describe('clear()', () => {
      it('should clear session using cookie auth', async () => {
        const factory = await createCookieSessionStorageFactory(
          mockLogger.get(),
          mockServer as any,
          defaultCookieOptions,
          false
        );

        const mockRequest = mockRouter.createKibanaRequest();
        const rawRequest = ensureRawRequest(mockRequest);
        const mockClear = jest.fn();
        (rawRequest as any).cookieAuth = { clear: mockClear };

        factory.asScoped(mockRequest).clear();

        expect(mockClear).toHaveBeenCalled();
      });
    });
  });
});
