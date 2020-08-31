/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import request from 'request';
import supertest from 'supertest';
import { ByteSizeValue } from '@kbn/config-schema';
import { BehaviorSubject } from 'rxjs';

import { CoreContext } from '../core_context';
import { HttpService } from './http_service';
import { KibanaRequest } from './router';

import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { configServiceMock } from '../config/config_service.mock';
import { contextServiceMock } from '../context/context_service.mock';
import { loggingSystemMock } from '../logging/logging_system.mock';

import { httpServerMock } from './http_server.mocks';
import { createCookieSessionStorageFactory } from './cookie_session_storage';

let server: HttpService;

let logger: ReturnType<typeof loggingSystemMock.create>;
let env: Env;
let coreContext: CoreContext;
const configService = configServiceMock.create();
const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
};

configService.atPath.mockReturnValue(
  new BehaviorSubject({
    hosts: ['http://1.2.3.4'],
    maxPayload: new ByteSizeValue(1024),
    autoListen: true,
    healthCheck: {
      delay: 2000,
    },
    ssl: {
      verificationMode: 'none',
    },
    compression: { enabled: true },
    xsrf: {
      disableProtection: true,
      whitelist: [],
    },
    customResponseHeaders: {},
    requestId: {
      allowFromAnyIp: true,
      ipAllowlist: [],
    },
  } as any)
);

beforeEach(() => {
  logger = loggingSystemMock.create();
  env = Env.createDefault(getEnvOptions());

  coreContext = { coreId: Symbol(), env, logger, configService: configService as any };
  server = new HttpService(coreContext);
});

afterEach(async () => {
  await server.stop();
});

interface User {
  id: string;
  roles?: string[];
}

interface Storage {
  value: User;
  expires: number;
  path: string;
}

function retrieveSessionCookie(cookies: string) {
  const sessionCookie = request.cookie(cookies);
  if (!sessionCookie) {
    throw new Error('session cookie expected to be defined');
  }
  return sessionCookie;
}

const userData = { id: '42' };
const sessionDurationMs = 1000;
const path = '/';
const sessVal = () => ({ value: userData, expires: Date.now() + sessionDurationMs, path });
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
const cookieOptions = {
  name: 'sid',
  encryptionKey: 'something_at_least_32_characters',
  validate: (session: Storage | Storage[]) => {
    if (Array.isArray(session)) {
      session = session[0];
    }
    const isValid = session.path === path && session.expires > Date.now();
    return { isValid, path: session.path };
  },
  isSecure: false,
  path,
};

describe('Cookie based SessionStorage', () => {
  describe('#set()', () => {
    it('Should write to session storage & set cookies', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('');

      router.get({ path, validate: false }, (context, req, res) => {
        const sessionStorage = factory.asScoped(req);
        sessionStorage.set(sessVal());
        return res.ok({});
      });

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        innerServer,
        cookieOptions
      );
      await server.start();

      const response = await supertest(innerServer.listener).get('/').expect(200);

      const cookies = response.get('set-cookie');
      expect(cookies).toBeDefined();
      expect(cookies).toHaveLength(1);

      const sessionCookie = retrieveSessionCookie(cookies[0]);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie.key).toBe('sid');
      expect(sessionCookie.value).toBeDefined();
      expect(sessionCookie.path).toBe('/');
      expect(sessionCookie.httpOnly).toBe(true);
    });
  });

  describe('#get()', () => {
    it('reads from session storage', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('');

      router.get({ path: '/', validate: false }, async (context, req, res) => {
        const sessionStorage = factory.asScoped(req);
        const sessionValue = await sessionStorage.get();
        if (!sessionValue) {
          sessionStorage.set(sessVal());
          return res.ok();
        }
        return res.ok({ body: { value: sessionValue.value } });
      });

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        innerServer,
        cookieOptions
      );
      await server.start();

      const response = await supertest(innerServer.listener).get('/').expect(200);

      const cookies = response.get('set-cookie');
      expect(cookies).toBeDefined();
      expect(cookies).toHaveLength(1);

      const sessionCookie = retrieveSessionCookie(cookies[0]);

      await supertest(innerServer.listener)
        .get('/')
        .set('Cookie', `${sessionCookie.key}=${sessionCookie.value}`)
        .expect(200, { value: userData });
    });

    it('returns null for empty session', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);

      const router = createRouter('');
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        const sessionStorage = factory.asScoped(req);
        const sessionValue = await sessionStorage.get();
        return res.ok({ body: { value: sessionValue } });
      });

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        innerServer,
        cookieOptions
      );
      await server.start();

      const response = await supertest(innerServer.listener).get('/').expect(200, { value: null });

      const cookies = response.get('set-cookie');
      expect(cookies).not.toBeDefined();
    });

    it('returns null for invalid session (expired) & clean cookies', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);

      const router = createRouter('');

      let setOnce = false;
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        const sessionStorage = factory.asScoped(req);
        if (!setOnce) {
          setOnce = true;
          sessionStorage.set(sessVal());
          return res.ok({ body: { value: userData } });
        }
        const sessionValue = await sessionStorage.get();
        return res.ok({ body: { value: sessionValue } });
      });

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        innerServer,
        cookieOptions
      );
      await server.start();

      const response = await supertest(innerServer.listener)
        .get('/')
        .expect(200, { value: userData });

      const cookies = response.get('set-cookie');
      expect(cookies).toBeDefined();

      await delay(sessionDurationMs);

      const sessionCookie = retrieveSessionCookie(cookies[0]);
      const response2 = await supertest(innerServer.listener)
        .get('/')
        .set('Cookie', `${sessionCookie.key}=${sessionCookie.value}`)
        .expect(200, { value: null });

      const cookies2 = response2.get('set-cookie');
      expect(cookies2).toEqual([
        'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/',
      ]);
    });

    it('returns null for invalid session (incorrect path) & clean cookies accurately', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);

      const router = createRouter('');

      let setOnce = false;
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        const sessionStorage = factory.asScoped(req);
        if (!setOnce) {
          setOnce = true;
          sessionStorage.set({ ...sessVal(), path: '/foo' });
          return res.ok({ body: { value: userData } });
        }
        const sessionValue = await sessionStorage.get();
        return res.ok({ body: { value: sessionValue } });
      });

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        innerServer,
        cookieOptions
      );
      await server.start();

      const response = await supertest(innerServer.listener)
        .get('/')
        .expect(200, { value: userData });

      const cookies = response.get('set-cookie');
      expect(cookies).toBeDefined();

      const sessionCookie = retrieveSessionCookie(cookies[0]);
      const response2 = await supertest(innerServer.listener)
        .get('/')
        .set('Cookie', `${sessionCookie.key}=${sessionCookie.value}`)
        .expect(200, { value: null });

      const cookies2 = response2.get('set-cookie');
      expect(cookies2).toEqual([
        'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/foo',
      ]);
    });

    // use mocks to simplify test setup
    it('returns null if multiple session cookies are detected.', async () => {
      const mockServer = {
        register: jest.fn(),
        auth: {
          strategy: jest.fn(),
          test: jest.fn(() => ['foo', 'bar']),
        },
      };

      const mockRequest = httpServerMock.createRawRequest();

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        mockServer as any,
        cookieOptions
      );

      expect(mockServer.register).toBeCalledTimes(1);
      expect(mockServer.auth.strategy).toBeCalledTimes(1);

      const session = await factory.asScoped(KibanaRequest.from(mockRequest)).get();
      expect(session).toBe(null);

      expect(mockServer.auth.test).toBeCalledTimes(1);
      expect(mockServer.auth.test).toHaveBeenCalledWith('security-cookie', mockRequest);

      expect(loggingSystemMock.collect(logger).warn).toEqual([
        ['Found 2 auth sessions when we were only expecting 1.'],
      ]);
    });

    it('returns session if single session cookie is in an array.', async () => {
      const mockServer = {
        register: jest.fn(),
        auth: {
          strategy: jest.fn(),
          test: jest.fn(() => ['foo']),
        },
      };

      const mockRequest = httpServerMock.createRawRequest();

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        mockServer as any,
        cookieOptions
      );

      expect(mockServer.register).toBeCalledTimes(1);
      expect(mockServer.auth.strategy).toBeCalledTimes(1);

      const session = await factory.asScoped(KibanaRequest.from(mockRequest)).get();
      expect(session).toBe('foo');

      expect(mockServer.auth.test).toBeCalledTimes(1);
      expect(mockServer.auth.test).toHaveBeenCalledWith('security-cookie', mockRequest);
    });

    it('logs the reason of validation function failure.', async () => {
      const mockServer = {
        register: jest.fn(),
        auth: {
          strategy: jest.fn(),
          test: () => {
            throw new Error('Invalid cookie.');
          },
        },
      };

      const mockRequest = httpServerMock.createRawRequest();

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        mockServer as any,
        cookieOptions
      );

      expect(mockServer.register).toBeCalledTimes(1);
      expect(mockServer.auth.strategy).toBeCalledTimes(1);

      const session = await factory.asScoped(KibanaRequest.from(mockRequest)).get();
      expect(session).toBe(null);

      expect(loggingSystemMock.collect(logger).debug).toEqual([['Error: Invalid cookie.']]);
    });
  });

  describe('#clear()', () => {
    it('clears session storage & remove cookies', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);

      const router = createRouter('');

      router.get({ path: '/', validate: false }, async (context, req, res) => {
        const sessionStorage = factory.asScoped(req);
        if (await sessionStorage.get()) {
          sessionStorage.clear();
          return res.ok({});
        }
        sessionStorage.set(sessVal());
        return res.ok({});
      });

      const factory = await createCookieSessionStorageFactory(
        logger.get(),
        innerServer,
        cookieOptions
      );
      await server.start();

      const response = await supertest(innerServer.listener).get('/').expect(200);

      const cookies = response.get('set-cookie');
      const sessionCookie = retrieveSessionCookie(cookies[0]);

      const response2 = await supertest(innerServer.listener)
        .get('/')
        .set('Cookie', `${sessionCookie.key}=${sessionCookie.value}`)
        .expect(200);

      const cookies2 = response2.get('set-cookie');
      expect(cookies2).toEqual([
        'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/',
      ]);
    });
  });

  describe('#options', () => {
    describe('#SameSite', () => {
      it('throws an exception if "SameSite: None" set on not Secure connection', async () => {
        const { server: innerServer } = await server.setup(setupDeps);

        expect(
          createCookieSessionStorageFactory(logger.get(), innerServer, {
            ...cookieOptions,
            sameSite: 'None',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"\\"SameSite: None\\" requires Secure connection"`
        );
      });

      for (const sameSite of ['Strict', 'Lax', 'None'] as const) {
        it(`sets and parses SameSite = ${sameSite} correctly`, async () => {
          const { server: innerServer, createRouter } = await server.setup(setupDeps);
          const router = createRouter('');

          router.get({ path: '/', validate: false }, async (context, req, res) => {
            const sessionStorage = factory.asScoped(req);
            const sessionValue = await sessionStorage.get();
            if (!sessionValue) {
              sessionStorage.set(sessVal());
              return res.ok();
            }
            return res.ok({ body: { value: sessionValue.value } });
          });

          const factory = await createCookieSessionStorageFactory(logger.get(), innerServer, {
            ...cookieOptions,
            isSecure: true,
            name: `sid-${sameSite}`,
            sameSite,
          });
          await server.start();

          const response = await supertest(innerServer.listener).get('/').expect(200);

          const cookies = response.get('set-cookie');
          expect(cookies).toBeDefined();
          expect(cookies).toHaveLength(1);

          const sessionCookie = retrieveSessionCookie(cookies[0]);
          expect(sessionCookie.extensions).toContain(`SameSite=${sameSite}`);

          await supertest(innerServer.listener)
            .get('/')
            .set('Cookie', `${sessionCookie.key}=${sessionCookie.value}`)
            .expect(200, { value: userData });
        });
      }
    });
  });
});
