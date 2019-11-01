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

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import supertest from 'supertest';

import { ByteSizeValue, schema } from '@kbn/config-schema';
import { HttpConfig } from './http_config';
import { Router } from './router';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { HttpServer } from './http_server';

const cookieOptions = {
  name: 'sid',
  encryptionKey: 'something_at_least_32_characters',
  validate: () => true,
  isSecure: false,
};

let server: HttpServer;
let config: HttpConfig;
let configWithSSL: HttpConfig;

const loggingService = loggingServiceMock.create();
const logger = loggingService.get();
const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

beforeEach(() => {
  config = {
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: 10002,
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

  server = new HttpServer(loggingService, 'tests');
});

afterEach(async () => {
  await server.stop();
  jest.clearAllMocks();
});

test('log listening address after started', async () => {
  expect(server.isListening()).toBe(false);

  await server.setup(config);
  await server.start();

  expect(server.isListening()).toBe(true);
  expect(loggingServiceMock.collect(loggingService).info).toMatchInlineSnapshot(`
    Array [
      Array [
        "http server running at http://127.0.0.1:10002",
      ],
    ]
  `);
});

test('log listening address after started when configured with BasePath and rewriteBasePath = false', async () => {
  expect(server.isListening()).toBe(false);

  await server.setup({ ...config, basePath: '/bar', rewriteBasePath: false });
  await server.start();

  expect(server.isListening()).toBe(true);
  expect(loggingServiceMock.collect(loggingService).info).toMatchInlineSnapshot(`
    Array [
      Array [
        "http server running at http://127.0.0.1:10002",
      ],
    ]
  `);
});

test('log listening address after started when configured with BasePath and rewriteBasePath = true', async () => {
  expect(server.isListening()).toBe(false);

  await server.setup({ ...config, basePath: '/bar', rewriteBasePath: true });
  await server.start();

  expect(server.isListening()).toBe(true);
  expect(loggingServiceMock.collect(loggingService).info).toMatchInlineSnapshot(`
    Array [
      Array [
        "http server running at http://127.0.0.1:10002/bar",
      ],
    ]
  `);
});

test('valid params', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  router.get(
    {
      path: '/{test}',
      validate: {
        params: schema.object({
          test: schema.string(),
        }),
      },
    },
    (context, req, res) => {
      return res.ok({ body: req.params.test });
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start();

  await supertest(innerServer.listener)
    .get('/foo/some-string')
    .expect(200)
    .then(res => {
      expect(res.text).toBe('some-string');
    });
});

test('invalid params', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  router.get(
    {
      path: '/{test}',
      validate: {
        params: schema.object({
          test: schema.number(),
        }),
      },
    },
    (context, req, res) => {
      return res.ok({ body: String(req.params.test) });
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
        error: 'Bad Request',
        statusCode: 400,
        message: '[request params.test]: expected value of type [number] but got [string]',
      });
    });
});

test('valid query', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

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
    (context, req, res) => {
      return res.ok({ body: req.query });
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
  const router = new Router('/foo', logger, enhanceWithContext);

  router.get(
    {
      path: '/',
      validate: {
        query: schema.object({
          bar: schema.number(),
        }),
      },
    },
    (context, req, res) => {
      return res.ok({ body: req.query });
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
        error: 'Bad Request',
        statusCode: 400,
        message: '[request query.bar]: expected value of type [number] but got [string]',
      });
    });
});

test('valid body', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

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
    (context, req, res) => {
      return res.ok({ body: req.body });
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
  const router = new Router('/foo', logger, enhanceWithContext);

  router.post(
    {
      path: '/',
      validate: {
        body: schema.object({
          bar: schema.number(),
        }),
      },
    },
    (context, req, res) => {
      return res.ok({ body: req.body });
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
        error: 'Bad Request',
        statusCode: 400,
        message: '[request body.bar]: expected value of type [number] but got [string]',
      });
    });
});

test('handles putting', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  router.put(
    {
      path: '/',
      validate: {
        body: schema.object({
          key: schema.string(),
        }),
      },
    },
    (context, req, res) => {
      return res.ok({ body: req.body });
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
  const router = new Router('/foo', logger, enhanceWithContext);

  router.delete(
    {
      path: '/{id}',
      validate: {
        params: schema.object({
          id: schema.number(),
        }),
      },
    },
    (context, req, res) => {
      return res.ok({ body: { key: req.params.id } });
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

    const router = new Router('/', logger, enhanceWithContext);
    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'value:/' }));
    router.get({ path: '/foo', validate: false }, (context, req, res) =>
      res.ok({ body: 'value:/foo' })
    );

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
        expect(res.text).toBe('value:/');
      });
  });

  test('/foo => /foo', async () => {
    await supertest(innerServerListener)
      .get('/foo')
      .expect(200)
      .then(res => {
        expect(res.text).toBe('value:/foo');
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

    const router = new Router('/', logger, enhanceWithContext);
    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'value:/' }));
    router.get({ path: '/foo', validate: false }, (context, req, res) =>
      res.ok({ body: 'value:/foo' })
    );

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
        expect(res.text).toBe('value:/');
      });
  });

  test('/bar/ => /', async () => {
    await supertest(innerServerListener)
      .get('/bar/')
      .expect(200)
      .then(res => {
        expect(res.text).toBe('value:/');
      });
  });

  test('/bar/foo => /foo', async () => {
    await supertest(innerServerListener)
      .get('/bar/foo')
      .expect(200)
      .then(res => {
        expect(res.text).toBe('value:/foo');
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
  const router = new Router('/', logger, enhanceWithContext);
  router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'value:/' }));

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

test('throws an error if starts without set up', async () => {
  await expect(server.start()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Http server is not setup up yet"`
  );
});

test('allows attaching metadata to attach meta-data tag strings to a route', async () => {
  const tags = ['my:tag'];
  const { registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('', logger, enhanceWithContext);
  router.get({ path: '/with-tags', validate: false, options: { tags } }, (context, req, res) =>
    res.ok({ body: { tags: req.route.options.tags } })
  );
  router.get({ path: '/without-tags', validate: false }, (context, req, res) =>
    res.ok({ body: { tags: req.route.options.tags } })
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

  const router = new Router('', logger, enhanceWithContext);
  router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: req.route }));
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

  describe('#auth.isAuthenticated()', () => {
    it('returns true if has been authorized', async () => {
      const { registerAuth, registerRouter, server: innerServer, auth } = await server.setup(
        config
      );

      const router = new Router('', logger, enhanceWithContext);
      router.get({ path: '/', validate: false }, (context, req, res) =>
        res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
      );
      registerRouter(router);

      await registerAuth((req, res, toolkit) => toolkit.authenticated());

      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { isAuthenticated: true });
    });

    it('returns false if has not been authorized', async () => {
      const { registerAuth, registerRouter, server: innerServer, auth } = await server.setup(
        config
      );

      const router = new Router('', logger, enhanceWithContext);
      router.get(
        { path: '/', validate: false, options: { authRequired: false } },
        (context, req, res) => res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
      );
      registerRouter(router);

      await registerAuth((req, res, toolkit) => toolkit.authenticated());

      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { isAuthenticated: false });
    });

    it('returns false if no authorization mechanism has been registered', async () => {
      const { registerRouter, server: innerServer, auth } = await server.setup(config);

      const router = new Router('', logger, enhanceWithContext);
      router.get(
        { path: '/', validate: false, options: { authRequired: false } },
        (context, req, res) => res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
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
      registerAuth((req, res, toolkit) => {
        sessionStorageFactory.asScoped(req).set({ value: user, expires: Date.now() + 1000 });
        return toolkit.authenticated({ state: user });
      });

      const router = new Router('', logger, enhanceWithContext);
      router.get({ path: '/', validate: false }, (context, req, res) =>
        res.ok({ body: auth.get(req) })
      );
      registerRouter(router);
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(200, { state: user, status: 'authenticated' });
    });

    it('returns correct authentication unknown status', async () => {
      const { registerRouter, server: innerServer, auth } = await server.setup(config);

      const router = new Router('', logger, enhanceWithContext);
      router.get({ path: '/', validate: false }, (context, req, res) =>
        res.ok({ body: auth.get(req) })
      );

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
      const router = new Router('', logger, enhanceWithContext);
      router.get(
        { path: '/', validate: false, options: { authRequired: false } },
        (context, req, res) => res.ok({ body: auth.get(req) })
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
