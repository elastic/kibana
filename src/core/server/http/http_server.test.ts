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

import { Server } from 'http';
import request from 'request';
import Boom from 'boom';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import Chance from 'chance';
import supertest from 'supertest';

import { ByteSizeValue, schema } from '@kbn/config-schema';
import { HttpConfig, Router } from '.';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { HttpServer } from './http_server';

const cookieOptions = {
  name: 'sid',
  encryptionKey: 'something_at_least_32_characters',
  validate: () => true,
  isSecure: false,
};

interface User {
  id: string;
  roles?: string[];
}

interface StorageData {
  value: User;
  expires: number;
}

const chance = new Chance();

let server: HttpServer;
let config: HttpConfig;
let configWithSSL: HttpConfig;

const logger = loggingServiceMock.create();

beforeEach(() => {
  config = {
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: chance.integer({ min: 10000, max: 15000 }),
    ssl: { enabled: false },
  } as HttpConfig;

  configWithSSL = {
    ...config,
    ssl: {
      enabled: true,
      certificate: '/certificate',
      cipherSuites: ['cipherSuite'],
      getSecureOptions: () => 0,
      key: '/key',
      redirectHttpFromPort: config.port + 1,
    },
  } as HttpConfig;

  server = new HttpServer(logger, 'tests');
});

afterEach(async () => {
  await server.stop();
  jest.clearAllMocks();
});

test('listening after started', async () => {
  expect(server.isListening()).toBe(false);

  await server.setup(config);
  await server.start();

  expect(server.isListening()).toBe(true);
  expect(loggingServiceMock.collect(logger).info).toMatchInlineSnapshot(`
Array [
  Array [
    "http server running",
  ],
]
`);
});

test('valid params', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/{test}',
      validate: {
        params: schema.object({
          test: schema.string(),
        }),
      },
    },
    (req, res) => {
      return res.ok({ key: req.params.test });
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .get('/foo/some-string')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'some-string' });
    });
});

test('invalid params', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/{test}',
      validate: {
        params: schema.object({
          test: schema.number(),
        }),
      },
    },
    (req, res) => {
      return res.ok({ key: req.params.test });
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .get('/foo/some-string')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[request params.test]: expected value of type [number] but got [string]',
      });
    });
});

test('valid query', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/',
      validate: {
        query: schema.object({
          bar: schema.string(),
          quux: schema.number(),
        }),
      },
    },
    (req, res) => {
      return res.ok(req.query);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .get('/foo/?bar=test&quux=123')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ bar: 'test', quux: 123 });
    });
});

test('invalid query', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/',
      validate: {
        query: schema.object({
          bar: schema.number(),
        }),
      },
    },
    (req, res) => {
      return res.ok(req.query);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .get('/foo/?bar=test')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[request query.bar]: expected value of type [number] but got [string]',
      });
    });
});

test('valid body', async () => {
  const router = new Router('/foo');

  router.post(
    {
      path: '/',
      validate: {
        body: schema.object({
          bar: schema.string(),
          baz: schema.number(),
        }),
      },
    },
    (req, res) => {
      return res.ok(req.body);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .post('/foo/')
    .send({
      bar: 'test',
      baz: 123,
    })
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ bar: 'test', baz: 123 });
    });
});

test('invalid body', async () => {
  const router = new Router('/foo');

  router.post(
    {
      path: '/',
      validate: {
        body: schema.object({
          bar: schema.number(),
        }),
      },
    },
    (req, res) => {
      return res.ok(req.body);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .post('/foo/')
    .send({ bar: 'test' })
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[request body.bar]: expected value of type [number] but got [string]',
      });
    });
});

test('handles putting', async () => {
  const router = new Router('/foo');

  router.put(
    {
      path: '/',
      validate: {
        body: schema.object({
          key: schema.string(),
        }),
      },
    },
    (req, res) => {
      return res.ok(req.body);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .put('/foo/')
    .send({ key: 'new value' })
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'new value' });
    });
});

test('handles deleting', async () => {
  const router = new Router('/foo');

  router.delete(
    {
      path: '/{id}',
      validate: {
        params: schema.object({
          id: schema.number(),
        }),
      },
    },
    (req, res) => {
      return res.ok({ key: req.params.id });
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .delete('/foo/3')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 3 });
    });
});

describe('with `basepath: /bar` and `rewriteBasePath: false`', () => {
  let configWithBasePath: HttpConfig;
  let innerServerListener: Server;

  beforeEach(async () => {
    configWithBasePath = {
      ...config,
      basePath: '/bar',
      rewriteBasePath: false,
    } as HttpConfig;

    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok({ key: 'value:/' }));
    router.get({ path: '/foo', validate: false }, (req, res) => res.ok({ key: 'value:/foo' }));

    const { registerRouter, server: innerServer } = await server.setup(configWithBasePath);
    registerRouter(router);

    await server.start();
    innerServerListener = innerServer.listener;
  });

  test('/bar => 404', async () => {
    await supertest(innerServerListener)
      .get('/bar')
      .expect(404);
  });

  test('/bar/ => 404', async () => {
    await supertest(innerServerListener)
      .get('/bar/')
      .expect(404);
  });

  test('/bar/foo => 404', async () => {
    await supertest(innerServerListener)
      .get('/bar/foo')
      .expect(404);
  });

  test('/ => /', async () => {
    await supertest(innerServerListener)
      .get('/')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/' });
      });
  });

  test('/foo => /foo', async () => {
    await supertest(innerServerListener)
      .get('/foo')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/foo' });
      });
  });
});

describe('with `basepath: /bar` and `rewriteBasePath: true`', () => {
  let configWithBasePath: HttpConfig;
  let innerServerListener: Server;

  beforeEach(async () => {
    configWithBasePath = {
      ...config,
      basePath: '/bar',
      rewriteBasePath: true,
    } as HttpConfig;

    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok({ key: 'value:/' }));
    router.get({ path: '/foo', validate: false }, (req, res) => res.ok({ key: 'value:/foo' }));

    const { registerRouter, server: innerServer } = await server.setup(configWithBasePath);
    registerRouter(router);

    await server.start();
    innerServerListener = innerServer.listener;
  });

  test('/bar => /', async () => {
    await supertest(innerServerListener)
      .get('/bar')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/' });
      });
  });

  test('/bar/ => /', async () => {
    await supertest(innerServerListener)
      .get('/bar/')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/' });
      });
  });

  test('/bar/foo => /foo', async () => {
    await supertest(innerServerListener)
      .get('/bar/foo')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/foo' });
      });
  });

  test('/ => 404', async () => {
    await supertest(innerServerListener)
      .get('/')
      .expect(404);
  });

  test('/foo => 404', async () => {
    await supertest(innerServerListener)
      .get('/foo')
      .expect(404);
  });
});

test('with defined `redirectHttpFromPort`', async () => {
  const router = new Router('/');
  router.get({ path: '/', validate: false }, (req, res) => res.ok({ key: 'value:/' }));

  const { registerRouter } = await server.setup(configWithSSL);
  registerRouter(router);

  await server.start();
});

test('returns server and connection options on start', async () => {
  const configWithPort = {
    ...config,
    port: 12345,
  };
  const { server: innerServer } = await server.setup(configWithPort);

  expect(innerServer).toBeDefined();
  expect(innerServer).toBe((server as any).server);
});

test('registers registerOnPostAuth interceptor several times', async () => {
  const { registerOnPostAuth } = await server.setup(config);
  const doRegister = () => registerOnPostAuth(() => null as any);

  doRegister();
  expect(doRegister).not.toThrowError();
});

test('throws an error if starts without set up', async () => {
  await expect(server.start()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Http server is not setup up yet"`
  );
});

test('enables auth for a route by default if registerAuth has been called', async () => {
  const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('');
  router.get({ path: '/', validate: false }, (req, res) =>
    res.ok({ authRequired: req.route.options.authRequired })
  );
  registerRouter(router);

  const authenticate = jest.fn().mockImplementation((req, t) => t.authenticated());
  registerAuth(authenticate);

  await server.start();
  await supertest(innerServer.listener)
    .get('/')
    .expect(200, { authRequired: true });

  expect(authenticate).toHaveBeenCalledTimes(1);
});

test('supports disabling auth for a route explicitly', async () => {
  const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('');
  router.get({ path: '/', validate: false, options: { authRequired: false } }, (req, res) =>
    res.ok({ authRequired: req.route.options.authRequired })
  );
  registerRouter(router);
  const authenticate = jest.fn();
  registerAuth(authenticate);

  await server.start();
  await supertest(innerServer.listener)
    .get('/')
    .expect(200, { authRequired: false });

  expect(authenticate).toHaveBeenCalledTimes(0);
});

test('supports enabling auth for a route explicitly', async () => {
  const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('');
  router.get({ path: '/', validate: false, options: { authRequired: true } }, (req, res) =>
    res.ok({ authRequired: req.route.options.authRequired })
  );
  registerRouter(router);
  const authenticate = jest.fn().mockImplementation((req, t) => t.authenticated({}));
  await registerAuth(authenticate);

  await server.start();
  await supertest(innerServer.listener)
    .get('/')
    .expect(200, { authRequired: true });

  expect(authenticate).toHaveBeenCalledTimes(1);
});

test('allows attaching metadata to attach meta-data tag strings to a route', async () => {
  const tags = ['my:tag'];
  const { registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('');
  router.get({ path: '/with-tags', validate: false, options: { tags } }, (req, res) =>
    res.ok({ tags: req.route.options.tags })
  );
  router.get({ path: '/without-tags', validate: false }, (req, res) =>
    res.ok({ tags: req.route.options.tags })
  );
  registerRouter(router);

  await server.start();
  await supertest(innerServer.listener)
    .get('/with-tags')
    .expect(200, { tags });

  await supertest(innerServer.listener)
    .get('/without-tags')
    .expect(200, { tags: [] });
});

test('exposes route details of incoming request to a route handler', async () => {
  const { registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('');
  router.get({ path: '/', validate: false }, (req, res) => res.ok(req.route));
  registerRouter(router);

  await server.start();
  await supertest(innerServer.listener)
    .get('/')
    .expect(200, {
      method: 'get',
      path: '/',
      options: {
        authRequired: true,
        tags: [],
      },
    });
});

describe('setup contract', () => {
  describe('#createSessionStorage', () => {
    it('creates session storage factory', async () => {
      const { createCookieSessionStorageFactory } = await server.setup(config);
      const sessionStorageFactory = await createCookieSessionStorageFactory(cookieOptions);

      expect(sessionStorageFactory.asScoped).toBeDefined();
    });
    it('creates session storage factory only once', async () => {
      const { createCookieSessionStorageFactory } = await server.setup(config);
      const create = async () => await createCookieSessionStorageFactory(cookieOptions);

      await create();
      expect(create()).rejects.toThrowError('A cookieSessionStorageFactory was already created');
    });
  });
  describe('#registerAuth', () => {
    it('registers auth request interceptor only once', async () => {
      const { registerAuth } = await server.setup(config);
      const doRegister = () => registerAuth(() => null as any);

      doRegister();
      expect(doRegister).toThrowError('Auth interceptor was already registered');
    });

    it('may grant access to a resource', async () => {
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
      const router = new Router('');
      router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
      registerRouter(router);

      await registerAuth((req, t) => t.authenticated());
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { content: 'ok' });
    });

    it('supports rejecting a request from an unauthenticated user', async () => {
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
      const router = new Router('');
      router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
      registerRouter(router);

      await registerAuth((req, t) => t.rejected(Boom.unauthorized()));
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(401);
    });

    it('supports redirecting', async () => {
      const redirectTo = '/redirect-url';
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
      const router = new Router('');
      router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
      registerRouter(router);

      await registerAuth((req, t) => {
        return t.redirected(redirectTo);
      });
      await server.start();

      const response = await supertest(innerServer.listener)
        .get('/')
        .expect(302);
      expect(response.header.location).toBe(redirectTo);
    });

    it(`doesn't expose internal error details`, async () => {
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
      const router = new Router('');
      router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
      registerRouter(router);

      await registerAuth((req, t) => {
        throw new Error('sensitive info');
      });
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
    });

    it('allows manipulating cookies via cookie session storage', async () => {
      const router = new Router('');
      router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));

      const {
        createCookieSessionStorageFactory,
        registerAuth,
        registerRouter,
        server: innerServer,
      } = await server.setup(config);
      const sessionStorageFactory = await createCookieSessionStorageFactory<StorageData>(
        cookieOptions
      );
      registerAuth((req, t) => {
        const user = { id: '42' };
        const sessionStorage = sessionStorageFactory.asScoped(req);
        sessionStorage.set({ value: user, expires: Date.now() + 1000 });
        return t.authenticated({ state: user });
      });
      registerRouter(router);
      await server.start();

      const response = await supertest(innerServer.listener)
        .get('/')
        .expect(200, { content: 'ok' });

      expect(response.header['set-cookie']).toBeDefined();
      const cookies = response.header['set-cookie'];
      expect(cookies).toHaveLength(1);

      const sessionCookie = request.cookie(cookies[0]);
      if (!sessionCookie) {
        throw new Error('session cookie expected to be defined');
      }
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie.key).toBe('sid');
      expect(sessionCookie.value).toBeDefined();
      expect(sessionCookie.path).toBe('/');
      expect(sessionCookie.httpOnly).toBe(true);
    });

    it('allows manipulating cookies from route handler', async () => {
      const {
        createCookieSessionStorageFactory,
        registerAuth,
        registerRouter,
        server: innerServer,
      } = await server.setup(config);
      const sessionStorageFactory = await createCookieSessionStorageFactory<StorageData>(
        cookieOptions
      );
      registerAuth((req, t) => {
        const user = { id: '42' };
        const sessionStorage = sessionStorageFactory.asScoped(req);
        sessionStorage.set({ value: user, expires: Date.now() + 1000 });
        return t.authenticated();
      });

      const router = new Router('');
      router.get({ path: '/', validate: false }, (req, res) => res.ok({ content: 'ok' }));
      router.get({ path: '/with-cookie', validate: false }, (req, res) => {
        const sessionStorage = sessionStorageFactory.asScoped(req);
        sessionStorage.clear();
        return res.ok({ content: 'ok' });
      });
      registerRouter(router);

      await server.start();

      const responseToSetCookie = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(responseToSetCookie.header['set-cookie']).toBeDefined();

      const responseToResetCookie = await supertest(innerServer.listener)
        .get('/with-cookie')
        .expect(200);

      expect(responseToResetCookie.header['set-cookie']).toEqual([
        'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/',
      ]);
    });

    it.skip('is the only place with access to the authorization header', async () => {
      const token = 'Basic: user:password';
      const {
        registerAuth,
        registerOnPreAuth,
        registerOnPostAuth,
        registerRouter,
        server: innerServer,
      } = await server.setup(config);

      let fromRegisterOnPreAuth;
      await registerOnPreAuth((req, t) => {
        fromRegisterOnPreAuth = req.headers.authorization;
        return t.next();
      });

      let fromRegisterAuth;
      await registerAuth((req, t) => {
        fromRegisterAuth = req.headers.authorization;
        return t.authenticated();
      });

      let fromRegisterOnPostAuth;
      await registerOnPostAuth((req, t) => {
        fromRegisterOnPostAuth = req.headers.authorization;
        return t.next();
      });

      let fromRouteHandler;
      const router = new Router('');
      router.get({ path: '/', validate: false }, (req, res) => {
        fromRouteHandler = req.headers.authorization;
        return res.ok({ content: 'ok' });
      });
      registerRouter(router);

      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .set('Authorization', token)
        .expect(200);

      expect(fromRegisterOnPreAuth).toEqual({});
      expect(fromRegisterAuth).toEqual({ authorization: token });
      expect(fromRegisterOnPostAuth).toEqual({});
      expect(fromRouteHandler).toEqual({});
    });

    it('attach security header to a successful response', async () => {
      const authResponseHeader = {
        'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
      };
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

      await registerAuth((req, t) => {
        return t.authenticated({ responseHeaders: authResponseHeader });
      });

      const router = new Router('/');
      router.get({ path: '/', validate: false }, (req, res) => res.ok({ header: 'ok' }));
      registerRouter(router);

      await server.start();

      const response = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
    });

    it('attach security header to an error response', async () => {
      const authResponseHeader = {
        'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
      };
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

      await registerAuth((req, t) => {
        return t.authenticated({ responseHeaders: authResponseHeader });
      });

      const router = new Router('/');
      router.get({ path: '/', validate: false }, (req, res) => res.badRequest(new Error('reason')));
      registerRouter(router);

      await server.start();

      const response = await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
    });

    // TODO un-skip when NP ResponseFactory supports configuring custom headers
    it.skip('logs warning if Auth Security Header rewrites response header for success response', async () => {
      const authResponseHeader = {
        'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
      };
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

      await registerAuth((req, t) => {
        return t.authenticated({ responseHeaders: authResponseHeader });
      });

      const router = new Router('/');
      router.get({ path: '/', validate: false }, (req, res) => res.ok({}));
      registerRouter(router);

      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot();
    });

    it.skip('logs warning if Auth Security Header rewrites response header for error response', async () => {
      const authResponseHeader = {
        'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
      };
      const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

      await registerAuth((req, t) => {
        return t.authenticated({ responseHeaders: authResponseHeader });
      });

      const router = new Router('/');
      router.get({ path: '/', validate: false }, (req, res) => res.badRequest(new Error('reason')));
      registerRouter(router);

      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot();
    });
  });

  describe('#auth.isAuthenticated()', () => {
    it('returns true if has been authorized', async () => {
      const { registerAuth, registerRouter, server: innerServer, auth } = await server.setup(
        config
      );

      const router = new Router('');
      router.get({ path: '/', validate: false }, (req, res) =>
        res.ok({ isAuthenticated: auth.isAuthenticated(req) })
      );
      registerRouter(router);

      await registerAuth((req, t) => t.authenticated());

      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { isAuthenticated: true });
    });

    it('returns false if has not been authorized', async () => {
      const { registerAuth, registerRouter, server: innerServer, auth } = await server.setup(
        config
      );

      const router = new Router('');
      router.get({ path: '/', validate: false, options: { authRequired: false } }, (req, res) =>
        res.ok({ isAuthenticated: auth.isAuthenticated(req) })
      );
      registerRouter(router);

      await registerAuth((req, t) => t.authenticated());

      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { isAuthenticated: false });
    });

    it('returns false if no authorization mechanism has been registered', async () => {
      const { registerRouter, server: innerServer, auth } = await server.setup(config);

      const router = new Router('');
      router.get({ path: '/', validate: false, options: { authRequired: false } }, (req, res) =>
        res.ok({ isAuthenticated: auth.isAuthenticated(req) })
      );
      registerRouter(router);

      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { isAuthenticated: false });
    });
  });

  describe('#auth.get()', () => {
    it('returns authenticated status and allow associate auth state with request', async () => {
      const user = { id: '42' };
      const {
        createCookieSessionStorageFactory,
        registerRouter,
        registerAuth,
        server: innerServer,
        auth,
      } = await server.setup(config);
      const sessionStorageFactory = await createCookieSessionStorageFactory(cookieOptions);
      registerAuth((req, t) => {
        sessionStorageFactory.asScoped(req).set({ value: user, expires: Date.now() + 1000 });
        return t.authenticated({ state: user });
      });

      const router = new Router('');
      router.get({ path: '/', validate: false }, (req, res) => res.ok(auth.get(req)));
      registerRouter(router);
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { state: user, status: 'authenticated' });
    });

    it('returns correct authentication unknown status', async () => {
      const { registerRouter, server: innerServer, auth } = await server.setup(config);
      const router = new Router('');
      router.get({ path: '/', validate: false }, (req, res) => res.ok(auth.get(req)));

      registerRouter(router);
      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { status: 'unknown' });
    });

    it('returns correct unauthenticated status', async () => {
      const authenticate = jest.fn();

      const { registerRouter, registerAuth, server: innerServer, auth } = await server.setup(
        config
      );
      await registerAuth(authenticate);
      const router = new Router('');
      router.get({ path: '/', validate: false, options: { authRequired: false } }, (req, res) =>
        res.ok(auth.get(req))
      );

      registerRouter(router);
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { status: 'unauthenticated' });

      expect(authenticate).not.toHaveBeenCalled();
    });
  });

  describe('#isTlsEnabled', () => {
    it('returns "true" if TLS enabled', async () => {
      const { isTlsEnabled } = await server.setup(configWithSSL);
      expect(isTlsEnabled).toBe(true);
    });
    it('returns "false" if TLS not enabled', async () => {
      const { isTlsEnabled } = await server.setup(config);
      expect(isTlsEnabled).toBe(false);
    });
  });
});
