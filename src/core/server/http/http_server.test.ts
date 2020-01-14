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
import { readFileSync } from 'fs';
import supertest from 'supertest';

import { ByteSizeValue, schema } from '@kbn/config-schema';
import { HttpConfig } from './http_config';
import {
  Router,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RouteValidationResultFactory,
  RouteValidationFunction,
} from './router';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { HttpServer } from './http_server';
import { Readable } from 'stream';
import { RequestHandlerContext } from 'kibana/server';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';

const cookieOptions = {
  name: 'sid',
  encryptionKey: 'something_at_least_32_characters',
  validate: () => ({ isValid: true }),
  isSecure: false,
};

let server: HttpServer;
let config: HttpConfig;
let configWithSSL: HttpConfig;

const loggingService = loggingServiceMock.create();
const logger = loggingService.get();
const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

let certificate: string;
let key: string;

beforeAll(() => {
  certificate = readFileSync(KBN_CERT_PATH, 'utf8');
  key = readFileSync(KBN_KEY_PATH, 'utf8');
});

beforeEach(() => {
  config = {
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: 10002,
    ssl: { enabled: false },
    compression: { enabled: true },
  } as HttpConfig;

  configWithSSL = {
    ...config,
    ssl: {
      enabled: true,
      certificate,
      cipherSuites: ['cipherSuite'],
      getSecureOptions: () => 0,
      key,
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

test('valid body with validate function', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  router.post(
    {
      path: '/',
      validate: {
        body: ({ bar, baz } = {}, { ok, badRequest }) => {
          if (typeof bar === 'string' && typeof baz === 'number') {
            return ok({ bar, baz });
          } else {
            return badRequest('Wrong payload', ['body']);
          }
        },
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

test('not inline validation - specifying params', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  const bodyValidation = (
    { bar, baz }: any = {},
    { ok, badRequest }: RouteValidationResultFactory
  ) => {
    if (typeof bar === 'string' && typeof baz === 'number') {
      return ok({ bar, baz });
    } else {
      return badRequest('Wrong payload', ['body']);
    }
  };

  router.post(
    {
      path: '/',
      validate: {
        body: bodyValidation,
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

test('not inline validation - specifying validation handler', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  const bodyValidation: RouteValidationFunction<{ bar: string; baz: number }> = (
    { bar, baz } = {},
    { ok, badRequest }
  ) => {
    if (typeof bar === 'string' && typeof baz === 'number') {
      return ok({ bar, baz });
    } else {
      return badRequest('Wrong payload', ['body']);
    }
  };

  router.post(
    {
      path: '/',
      validate: {
        body: bodyValidation,
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

// https://github.com/elastic/kibana/issues/47047
test('not inline handler - KibanaRequest', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  const handler = (
    context: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, { bar: string; baz: number }>,
    res: KibanaResponseFactory
  ) => {
    const body = {
      bar: req.body.bar.toUpperCase(),
      baz: req.body.baz.toString(),
    };

    return res.ok({ body });
  };

  router.post(
    {
      path: '/',
      validate: {
        body: ({ bar, baz } = {}, { ok, badRequest }) => {
          if (typeof bar === 'string' && typeof baz === 'number') {
            return ok({ bar, baz });
          } else {
            return badRequest('Wrong payload', ['body']);
          }
        },
      },
    },
    handler
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
      expect(res.body).toEqual({ bar: 'TEST', baz: '123' });
    });
});

test('not inline handler - RequestHandler', async () => {
  const router = new Router('/foo', logger, enhanceWithContext);

  const handler: RequestHandler<unknown, unknown, { bar: string; baz: number }> = (
    context,
    req,
    res
  ) => {
    const body = {
      bar: req.body.bar.toUpperCase(),
      baz: req.body.baz.toString(),
    };

    return res.ok({ body });
  };

  router.post(
    {
      path: '/',
      validate: {
        body: ({ bar, baz } = {}, { ok, badRequest }) => {
          if (typeof bar === 'string' && typeof baz === 'number') {
            return ok({ bar, baz });
          } else {
            return badRequest('Wrong payload', ['body']);
          }
        },
      },
    },
    handler
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
      expect(res.body).toEqual({ bar: 'TEST', baz: '123' });
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
  let innerServerListener: Server;
  let configWithBasePath: HttpConfig;

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

describe('conditional compression', () => {
  async function setupServer(innerConfig: HttpConfig) {
    const { registerRouter, server: innerServer } = await server.setup(innerConfig);
    const router = new Router('', logger, enhanceWithContext);
    // we need the large body here so that compression would normally be used
    const largeRequest = {
      body: 'hello'.repeat(500),
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    };
    router.get({ path: '/', validate: false }, (_context, _req, res) => res.ok(largeRequest));
    registerRouter(router);
    await server.start();
    return innerServer.listener;
  }

  test('with `compression.enabled: true`', async () => {
    const listener = await setupServer(config);

    const response = await supertest(listener)
      .get('/')
      .set('accept-encoding', 'gzip');

    expect(response.header).toHaveProperty('content-encoding', 'gzip');
  });

  test('with `compression.enabled: false`', async () => {
    const listener = await setupServer({
      ...config,
      compression: { enabled: false },
    });

    const response = await supertest(listener)
      .get('/')
      .set('accept-encoding', 'gzip');

    expect(response.header).not.toHaveProperty('content-encoding');
  });

  describe('with defined `compression.referrerWhitelist`', () => {
    let listener: Server;
    beforeEach(async () => {
      listener = await setupServer({
        ...config,
        compression: { enabled: true, referrerWhitelist: ['foo'] },
      });
    });

    test('enables compression for no referer', async () => {
      const response = await supertest(listener)
        .get('/')
        .set('accept-encoding', 'gzip');

      expect(response.header).toHaveProperty('content-encoding', 'gzip');
    });

    test('enables compression for whitelisted referer', async () => {
      const response = await supertest(listener)
        .get('/')
        .set('accept-encoding', 'gzip')
        .set('referer', 'http://foo:1234');

      expect(response.header).toHaveProperty('content-encoding', 'gzip');
    });

    test('disables compression for non-whitelisted referer', async () => {
      const response = await supertest(listener)
        .get('/')
        .set('accept-encoding', 'gzip')
        .set('referer', 'http://bar:1234');

      expect(response.header).not.toHaveProperty('content-encoding');
    });

    test('disables compression for invalid referer', async () => {
      const response = await supertest(listener)
        .get('/')
        .set('accept-encoding', 'gzip')
        .set('referer', 'http://asdf$%^');

      expect(response.header).not.toHaveProperty('content-encoding');
    });
  });
});

test('exposes route details of incoming request to a route handler (POST + payload options)', async () => {
  const { registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('', logger, enhanceWithContext);
  router.post(
    {
      path: '/',
      validate: { body: schema.object({ test: schema.number() }) },
      options: { body: { accepts: 'application/json' } },
    },
    (context, req, res) => res.ok({ body: req.route })
  );
  registerRouter(router);

  await server.start();
  await supertest(innerServer.listener)
    .post('/')
    .send({ test: 1 })
    .expect(200, {
      method: 'post',
      path: '/',
      options: {
        authRequired: true,
        tags: [],
        body: {
          parse: true, // hapi populates the default
          maxBytes: 1024, // hapi populates the default
          accepts: ['application/json'],
          output: 'data',
        },
      },
    });
});

describe('body options', () => {
  test('should reject the request because the Content-Type in the request is not valid', async () => {
    const { registerRouter, server: innerServer } = await server.setup(config);

    const router = new Router('', logger, enhanceWithContext);
    router.post(
      {
        path: '/',
        validate: { body: schema.object({ test: schema.number() }) },
        options: { body: { accepts: 'multipart/form-data' } }, // supertest sends 'application/json'
      },
      (context, req, res) => res.ok({ body: req.route })
    );
    registerRouter(router);

    await server.start();
    await supertest(innerServer.listener)
      .post('/')
      .send({ test: 1 })
      .expect(415, {
        statusCode: 415,
        error: 'Unsupported Media Type',
        message: 'Unsupported Media Type',
      });
  });

  test('should reject the request because the payload is too large', async () => {
    const { registerRouter, server: innerServer } = await server.setup(config);

    const router = new Router('', logger, enhanceWithContext);
    router.post(
      {
        path: '/',
        validate: { body: schema.object({ test: schema.number() }) },
        options: { body: { maxBytes: 1 } },
      },
      (context, req, res) => res.ok({ body: req.route })
    );
    registerRouter(router);

    await server.start();
    await supertest(innerServer.listener)
      .post('/')
      .send({ test: 1 })
      .expect(413, {
        statusCode: 413,
        error: 'Request Entity Too Large',
        message: 'Payload content length greater than maximum allowed: 1',
      });
  });

  test('should not parse the content in the request', async () => {
    const { registerRouter, server: innerServer } = await server.setup(config);

    const router = new Router('', logger, enhanceWithContext);
    router.post(
      {
        path: '/',
        validate: { body: schema.buffer() },
        options: { body: { parse: false } },
      },
      (context, req, res) => {
        try {
          expect(req.body).toBeInstanceOf(Buffer);
          expect(req.body.toString()).toBe(JSON.stringify({ test: 1 }));
          return res.ok({ body: req.route.options.body });
        } catch (err) {
          return res.internalError({ body: err.message });
        }
      }
    );
    registerRouter(router);

    await server.start();
    await supertest(innerServer.listener)
      .post('/')
      .send({ test: 1 })
      .expect(200, {
        parse: false,
        maxBytes: 1024, // hapi populates the default
        output: 'data',
      });
  });
});

test('should return a stream in the body', async () => {
  const { registerRouter, server: innerServer } = await server.setup(config);

  const router = new Router('', logger, enhanceWithContext);
  router.put(
    {
      path: '/',
      validate: { body: schema.stream() },
      options: { body: { output: 'stream' } },
    },
    (context, req, res) => {
      try {
        expect(req.body).toBeInstanceOf(Readable);
        return res.ok({ body: req.route.options.body });
      } catch (err) {
        return res.internalError({ body: err.message });
      }
    }
  );
  registerRouter(router);

  await server.start();
  await supertest(innerServer.listener)
    .put('/')
    .send({ test: 1 })
    .expect(200, {
      parse: true,
      maxBytes: 1024, // hapi populates the default
      output: 'stream',
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
