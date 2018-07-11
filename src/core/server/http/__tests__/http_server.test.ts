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

import { getEnvOptions } from '../../config/__tests__/__mocks__/env';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import Chance from 'chance';
import http from 'http';
import supertest from 'supertest';

import { Env } from '../../config';
import { ByteSizeValue } from '../../config/schema';
import { logger } from '../../logging/__mocks__';
import { HttpConfig } from '../http_config';
import { HttpServer } from '../http_server';
import { Router } from '../router';

const chance = new Chance();

let server: HttpServer;
let config: HttpConfig;

function getServerListener(httpServer: HttpServer) {
  return (httpServer as any).server.listener;
}

beforeEach(() => {
  config = {
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: chance.integer({ min: 10000, max: 15000 }),
    ssl: {},
  } as HttpConfig;

  server = new HttpServer(logger.get(), new Env('/kibana', getEnvOptions()));
});

afterEach(async () => {
  await server.stop();
  logger.mockClear();
});

test('listening after started', async () => {
  expect(server.isListening()).toBe(false);

  await server.start(config);

  expect(server.isListening()).toBe(true);
});

test('200 OK with body', async () => {
  const router = new Router('/foo');

  router.get({ path: '/', validate: false }, async (req, res) => {
    return res.ok({ key: 'value' });
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

  server.registerRouter(router);

  await server.start(config);

  await supertest(getServerListener(server))
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

    server.registerRouter(router);

    await server.start(configWithBasePath);
  });

  test('/bar => 404', async () => {
    await supertest(getServerListener(server))
      .get('/bar')
      .expect(404);
  });

  test('/bar/ => 404', async () => {
    await supertest(getServerListener(server))
      .get('/bar/')
      .expect(404);
  });

  test('/bar/foo => 404', async () => {
    await supertest(getServerListener(server))
      .get('/bar/foo')
      .expect(404);
  });

  test('/ => /', async () => {
    await supertest(getServerListener(server))
      .get('/')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/' });
      });
  });

  test('/foo => /foo', async () => {
    await supertest(getServerListener(server))
      .get('/foo')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/foo' });
      });
  });
});

describe('with `basepath: /bar` and `rewriteBasePath: true`', () => {
  let configWithBasePath: HttpConfig;

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

    server.registerRouter(router);

    await server.start(configWithBasePath);
  });

  test('/bar => /', async () => {
    await supertest(getServerListener(server))
      .get('/bar')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/' });
      });
  });

  test('/bar/ => /', async () => {
    await supertest(getServerListener(server))
      .get('/bar/')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/' });
      });
  });

  test('/bar/foo => /foo', async () => {
    await supertest(getServerListener(server))
      .get('/bar/foo')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'value:/foo' });
      });
  });

  test('/ => 404', async () => {
    await supertest(getServerListener(server))
      .get('/')
      .expect(404);
  });

  test('/foo => 404', async () => {
    await supertest(getServerListener(server))
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

    server.registerRouter(router);

    await server.start(configWithSSL);
  });
});

describe('when run within legacy platform', () => {
  let newPlatformProxyListenerMock: any;
  beforeEach(() => {
    newPlatformProxyListenerMock = {
      bind: jest.fn(),
      proxy: jest.fn(),
    };

    const kbnServerMock = {
      newPlatformProxyListener: newPlatformProxyListenerMock,
    };

    server = new HttpServer(
      logger.get(),
      new Env('/kibana', getEnvOptions({ kbnServer: kbnServerMock }))
    );

    const router = new Router('/new');
    router.get({ path: '/', validate: false }, async (req, res) => {
      return res.ok({ key: 'new-platform' });
    });

    server.registerRouter(router);

    newPlatformProxyListenerMock.proxy.mockImplementation(
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ key: `legacy-platform:${req.url}` }));
      }
    );
  });

  test('binds proxy listener to server.', async () => {
    expect(newPlatformProxyListenerMock.bind).not.toHaveBeenCalled();

    await server.start(config);

    expect(newPlatformProxyListenerMock.bind).toHaveBeenCalledTimes(1);
    expect(newPlatformProxyListenerMock.bind).toHaveBeenCalledWith(
      expect.any((http as any).Server)
    );
    expect(newPlatformProxyListenerMock.bind.mock.calls[0][0]).toBe(getServerListener(server));
  });

  test('forwards request to legacy platform if new one cannot handle it', async () => {
    await server.start(config);

    await supertest(getServerListener(server))
      .get('/legacy')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'legacy-platform:/legacy' });
        expect(newPlatformProxyListenerMock.proxy).toHaveBeenCalledTimes(1);
        expect(newPlatformProxyListenerMock.proxy).toHaveBeenCalledWith(
          expect.any((http as any).IncomingMessage),
          expect.any((http as any).ServerResponse)
        );
      });
  });

  test('forwards request to legacy platform and rewrites base path if needed', async () => {
    await server.start({
      ...config,
      basePath: '/bar',
      rewriteBasePath: true,
    });

    await supertest(getServerListener(server))
      .get('/legacy')
      .expect(404);

    await supertest(getServerListener(server))
      .get('/bar/legacy')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'legacy-platform:/legacy' });
        expect(newPlatformProxyListenerMock.proxy).toHaveBeenCalledTimes(1);
        expect(newPlatformProxyListenerMock.proxy).toHaveBeenCalledWith(
          expect.any((http as any).IncomingMessage),
          expect.any((http as any).ServerResponse)
        );
      });
  });

  test('do not forward request to legacy platform if new one can handle it', async () => {
    await server.start(config);

    await supertest(getServerListener(server))
      .get('/new/')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'new-platform' });
        expect(newPlatformProxyListenerMock.proxy).not.toHaveBeenCalled();
      });
  });
});
