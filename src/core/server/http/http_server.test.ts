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

import Chance from 'chance';
import supertest from 'supertest';

import { ByteSizeValue } from '@kbn/config-schema';
import { HttpConfig, Router } from '.';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { HttpServer } from './http_server';
import { KibanaRequest } from './router';

const chance = new Chance();

let server: HttpServer;
let config: HttpConfig;

const logger = loggingServiceMock.create();
beforeEach(() => {
  config = {
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: chance.integer({ min: 10000, max: 15000 }),
    ssl: {},
  } as HttpConfig;

  server = new HttpServer(logger.get());
});

afterEach(async () => {
  await server.stop();
  jest.clearAllMocks();
});

test('listening after started', async () => {
  expect(server.isListening()).toBe(false);

  await server.setup(config);
  await server.start(config);

  expect(server.isListening()).toBe(true);
});

test('200 OK with body', async () => {
  const router = new Router('/foo');

  router.get({ path: '/', validate: false }, async (req, res) => {
    return res.ok({ key: 'value' });
  });

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);
  await server.start(config);

  await supertest(innerServer.listener)
    .get('/foo/')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'value' });
    });
});

test('202 Accepted with body', async () => {
  const router = new Router('/foo');

  router.get({ path: '/', validate: false }, async (req, res) => {
    return res.accepted({ location: 'somewhere' });
  });

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .get('/foo/')
    .expect(202)
    .then(res => {
      expect(res.body).toEqual({ location: 'somewhere' });
    });
});

test('204 No content', async () => {
  const router = new Router('/foo');

  router.get({ path: '/', validate: false }, async (req, res) => {
    return res.noContent();
  });

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .get('/foo/')
    .expect(204)
    .then(res => {
      expect(res.body).toEqual({});
      // TODO Is ^ wrong or just a result of supertest, I expect `null` or `undefined`
    });
});

test('400 Bad request with error', async () => {
  const router = new Router('/foo');

  router.get({ path: '/', validate: false }, async (req, res) => {
    const err = new Error('some message');
    return res.badRequest(err);
  });

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .get('/foo/')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({ error: 'some message' });
    });
});

test('valid params', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/{test}',
      validate: schema => ({
        params: schema.object({
          test: schema.string(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok({ key: req.params.test });
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

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
      validate: schema => ({
        params: schema.object({
          test: schema.number(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok({ key: req.params.test });
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .get('/foo/some-string')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[test]: expected value of type [number] but got [string]',
      });
    });
});

test('valid query', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/',
      validate: schema => ({
        query: schema.object({
          bar: schema.string(),
          quux: schema.number(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok(req.query);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

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
      validate: schema => ({
        query: schema.object({
          bar: schema.number(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok(req.query);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .get('/foo/?bar=test')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[bar]: expected value of type [number] but got [string]',
      });
    });
});

test('valid body', async () => {
  const router = new Router('/foo');

  router.post(
    {
      path: '/',
      validate: schema => ({
        body: schema.object({
          bar: schema.string(),
          baz: schema.number(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok(req.body);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

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
      validate: schema => ({
        body: schema.object({
          bar: schema.number(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok(req.body);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .post('/foo/')
    .send({ bar: 'test' })
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[bar]: expected value of type [number] but got [string]',
      });
    });
});

test('handles putting', async () => {
  const router = new Router('/foo');

  router.put(
    {
      path: '/',
      validate: schema => ({
        body: schema.object({
          key: schema.string(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok(req.body);
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

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
      validate: schema => ({
        params: schema.object({
          id: schema.number(),
        }),
      }),
    },
    async (req, res) => {
      return res.ok({ key: req.params.id });
    }
  );

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .delete('/foo/3')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 3 });
    });
});

test('filtered headers', async () => {
  expect.assertions(1);

  const router = new Router('/foo');

  let filteredHeaders: any;

  router.get({ path: '/', validate: false }, async (req, res) => {
    filteredHeaders = req.getFilteredHeaders(['x-kibana-foo', 'host']);

    return res.noContent();
  });

  const { registerRouter, server: innerServer } = await server.setup(config);
  registerRouter(router);

  await server.start(config);

  await supertest(innerServer.listener)
    .get('/foo/?bar=quux')
    .set('x-kibana-foo', 'bar')
    .set('x-kibana-bar', 'quux');

  expect(filteredHeaders).toEqual({
    host: `127.0.0.1:${config.port}`,
    'x-kibana-foo': 'bar',
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
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ key: 'value:/' }));
    router.get({ path: '/foo', validate: false }, async (req, res) =>
      res.ok({ key: 'value:/foo' })
    );

    const { registerRouter, server: innerServer } = await server.setup(config);
    registerRouter(router);

    await server.start(configWithBasePath);
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
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ key: 'value:/' }));
    router.get({ path: '/foo', validate: false }, async (req, res) =>
      res.ok({ key: 'value:/foo' })
    );

    const { registerRouter, server: innerServer } = await server.setup(config);
    registerRouter(router);

    await server.start(configWithBasePath);
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

describe('with defined `redirectHttpFromPort`', () => {
  let configWithSSL: HttpConfig;

  beforeEach(async () => {
    configWithSSL = {
      ...config,
      ssl: {
        certificate: '/certificate',
        cipherSuites: ['cipherSuite'],
        enabled: true,
        getSecureOptions: () => 0,
        key: '/key',
        redirectHttpFromPort: config.port + 1,
      },
    } as HttpConfig;

    const router = new Router('/');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ key: 'value:/' }));

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start(configWithSSL);
  });
});

test('returns server and connection options on start', async () => {
  const configWithPort = {
    ...config,
    port: 12345,
  };
  const { options, server: innerServer } = await server.setup(configWithPort);

  expect(innerServer).toBeDefined();
  expect(innerServer).toBe((server as any).server);
  expect(options).toMatchSnapshot();
});

test('registers auth request interceptor only once', async () => {
  const { registerAuth } = await server.setup(config);
  const doRegister = () =>
    registerAuth(() => null as any, {
      encryptionKey: 'any_password',
    } as any);

  await doRegister();
  expect(doRegister()).rejects.toThrowError('Auth interceptor was already registered');
});

test('registers onRequest interceptor several times', async () => {
  const { registerOnRequest } = await server.setup(config);
  const doRegister = () => registerOnRequest(() => null as any);

  doRegister();
  expect(doRegister).not.toThrowError();
});

test('throws an error if starts without set up', async () => {
  await expect(server.start(config)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Http server is not setup up yet"`
  );
});

test('#getBasePathFor() returns base path associated with an incoming request', async () => {
  const {
    getBasePathFor,
    setBasePathFor,
    registerRouter,
    server: innerServer,
    registerOnRequest,
  } = await server.setup(config);

  const path = '/base-path';
  registerOnRequest((req, t) => {
    setBasePathFor(req, path);
    return t.next();
  });

  const router = new Router('/');
  router.get({ path: '/', validate: false }, (req, res) => res.ok({ key: getBasePathFor(req) }));
  registerRouter(router);

  await server.start(config);
  await supertest(innerServer.listener)
    .get('/')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: path });
    });
});

test('#getBasePathFor() is based on server base path', async () => {
  const configWithBasePath = {
    ...config,
    basePath: '/bar',
  };
  const {
    getBasePathFor,
    setBasePathFor,
    registerRouter,
    server: innerServer,
    registerOnRequest,
  } = await server.setup(configWithBasePath);

  const path = '/base-path';
  registerOnRequest((req, t) => {
    setBasePathFor(req, path);
    return t.next();
  });

  const router = new Router('/');
  router.get({ path: '/', validate: false }, async (req, res) =>
    res.ok({ key: getBasePathFor(req) })
  );
  registerRouter(router);

  await server.start(configWithBasePath);
  await supertest(innerServer.listener)
    .get('/')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: `${configWithBasePath.basePath}${path}` });
    });
});

test('#setBasePathFor() cannot be set twice for one request', async () => {
  const incomingMessage = {
    url: '/',
  };
  const kibanaRequestFactory = {
    from() {
      return KibanaRequest.from(
        {
          headers: {},
          path: '/',
          raw: {
            req: incomingMessage,
          },
        } as any,
        undefined
      );
    },
  };
  jest.doMock('./router/request', () => ({
    KibanaRequest: jest.fn(() => kibanaRequestFactory),
  }));

  const { setBasePathFor } = await server.setup(config);

  const setPath = () => setBasePathFor(kibanaRequestFactory.from(), '/path');

  setPath();
  expect(setPath).toThrowErrorMatchingInlineSnapshot(
    `"Request basePath was previously set. Setting multiple times is not supported."`
  );
});
