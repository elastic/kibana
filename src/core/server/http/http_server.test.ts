/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server } from 'http';
import { rm, mkdtemp, readFile, writeFile } from 'fs/promises';
import supertest from 'supertest';
import { omit } from 'lodash';
import { join } from 'path';

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
import { loggingSystemMock } from '../logging/logging_system.mock';
import { HttpServer } from './http_server';
import { Readable } from 'stream';
import { RequestHandlerContext } from 'kibana/server';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import moment from 'moment';
import { of } from 'rxjs';

const cookieOptions = {
  name: 'sid',
  encryptionKey: 'something_at_least_32_characters',
  validate: () => ({ isValid: true }),
  isSecure: false,
};

let server: HttpServer;
let config: HttpConfig;
let configWithSSL: HttpConfig;

const loggingService = loggingSystemMock.create();
const logger = loggingService.get();
const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

let certificate: string;
let key: string;

beforeAll(async () => {
  certificate = await readFile(KBN_CERT_PATH, 'utf8');
  key = await readFile(KBN_KEY_PATH, 'utf8');
});

beforeEach(() => {
  config = {
    name: 'kibana',
    host: '127.0.0.1',
    maxPayload: new ByteSizeValue(1024),
    port: 10002,
    ssl: { enabled: false },
    compression: { enabled: true },
    requestId: {
      allowFromAnyIp: true,
      ipAllowlist: [],
    },
    cors: {
      enabled: false,
    },
    shutdownTimeout: moment.duration(500, 'ms'),
  } as any;

  configWithSSL = {
    ...config,
    ssl: {
      enabled: true,
      certificate,
      cipherSuites: ['TLS_AES_256_GCM_SHA384'],
      getSecureOptions: () => 0,
      key,
      redirectHttpFromPort: config.port + 1,
    },
  } as HttpConfig;

  server = new HttpServer(loggingService, 'tests', of(config.shutdownTimeout));
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
  expect(loggingSystemMock.collect(loggingService).info).toMatchInlineSnapshot(`
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
  expect(loggingSystemMock.collect(loggingService).info).toMatchInlineSnapshot(`
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
  expect(loggingSystemMock.collect(loggingService).info).toMatchInlineSnapshot(`
    Array [
      Array [
        "http server running at http://127.0.0.1:10002/bar",
      ],
    ]
  `);
});

test('does not allow router registration after server is listening', async () => {
  expect(server.isListening()).toBe(false);

  const { registerRouter } = await server.setup(config);

  const router1 = new Router('/foo', logger, enhanceWithContext);
  expect(() => registerRouter(router1)).not.toThrowError();

  await server.start();

  expect(server.isListening()).toBe(true);

  const router2 = new Router('/bar', logger, enhanceWithContext);
  expect(() => registerRouter(router2)).toThrowErrorMatchingInlineSnapshot(
    `"Routers can be registered only when HTTP server is stopped."`
  );
});

test('allows router registration after server is listening via `registerRouterAfterListening`', async () => {
  expect(server.isListening()).toBe(false);

  const { registerRouterAfterListening } = await server.setup(config);

  const router1 = new Router('/foo', logger, enhanceWithContext);
  expect(() => registerRouterAfterListening(router1)).not.toThrowError();

  await server.start();

  expect(server.isListening()).toBe(true);

  const router2 = new Router('/bar', logger, enhanceWithContext);
  expect(() => registerRouterAfterListening(router2)).not.toThrowError();
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    .then((res) => {
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
    await supertest(innerServerListener).get('/bar').expect(404);
  });

  test('/bar/ => 404', async () => {
    await supertest(innerServerListener).get('/bar/').expect(404);
  });

  test('/bar/foo => 404', async () => {
    await supertest(innerServerListener).get('/bar/foo').expect(404);
  });

  test('/ => /', async () => {
    await supertest(innerServerListener)
      .get('/')
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('value:/');
      });
  });

  test('/foo => /foo', async () => {
    await supertest(innerServerListener)
      .get('/foo')
      .expect(200)
      .then((res) => {
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
      .then((res) => {
        expect(res.text).toBe('value:/');
      });
  });

  test('/bar/ => /', async () => {
    await supertest(innerServerListener)
      .get('/bar/')
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('value:/');
      });
  });

  test('/bar/foo => /foo', async () => {
    await supertest(innerServerListener)
      .get('/bar/foo')
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('value:/foo');
      });
  });

  test('/ => 404', async () => {
    await supertest(innerServerListener).get('/').expect(404);
  });

  test('/foo => 404', async () => {
    await supertest(innerServerListener).get('/foo').expect(404);
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
  await supertest(innerServer.listener).get('/with-tags').expect(200, { tags });

  await supertest(innerServer.listener).get('/without-tags').expect(200, { tags: [] });
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
        xsrfRequired: false,
        tags: [],
        timeout: {},
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

    const response = await supertest(listener).get('/').set('accept-encoding', 'gzip');

    expect(response.header).toHaveProperty('content-encoding', 'gzip');
  });

  test('with `compression.enabled: false`', async () => {
    const listener = await setupServer({
      ...config,
      compression: { enabled: false },
    });

    const response = await supertest(listener).get('/').set('accept-encoding', 'gzip');

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
      const response = await supertest(listener).get('/').set('accept-encoding', 'gzip');

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

describe('response headers', () => {
  test('allows to configure "keep-alive" header', async () => {
    const { registerRouter, server: innerServer } = await server.setup({
      ...config,
      keepaliveTimeout: 100_000,
    });

    const router = new Router('', logger, enhanceWithContext);
    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: req.route }));
    registerRouter(router);

    await server.start();
    const response = await supertest(innerServer.listener)
      .get('/')
      .set('Connection', 'keep-alive')
      .expect(200);

    expect(response.header.connection).toBe('keep-alive');
    expect(response.header['keep-alive']).toBe('timeout=100');
  });

  test('default headers', async () => {
    const { registerRouter, server: innerServer } = await server.setup(config);

    const router = new Router('', logger, enhanceWithContext);
    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: req.route }));
    registerRouter(router);

    await server.start();
    const response = await supertest(innerServer.listener).get('/').expect(200);

    const restHeaders = omit(response.header, ['date', 'content-length']);
    expect(restHeaders).toMatchInlineSnapshot(`
      Object {
        "accept-ranges": "bytes",
        "cache-control": "private, no-cache, no-store, must-revalidate",
        "connection": "close",
        "content-type": "application/json; charset=utf-8",
      }
    `);
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
        xsrfRequired: true,
        tags: [],
        timeout: {
          payload: 10000,
        },
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
    await supertest(innerServer.listener).post('/').send({ test: 1 }).expect(415, {
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
    await supertest(innerServer.listener).post('/').send({ test: 1 }).expect(413, {
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
        expect(req.body).toBeInstanceOf(Buffer);
        expect(req.body.toString()).toBe(JSON.stringify({ test: 1 }));
        return res.ok({ body: req.route.options.body });
      }
    );
    registerRouter(router);

    await server.start();
    await supertest(innerServer.listener).post('/').send({ test: 1 }).expect(200, {
      parse: false,
      maxBytes: 1024, // hapi populates the default
      output: 'data',
    });
  });
});

describe('timeout options', () => {
  describe('payload timeout', () => {
    test('POST routes set the payload timeout', async () => {
      const { registerRouter, server: innerServer } = await server.setup(config);

      const router = new Router('', logger, enhanceWithContext);
      router.post(
        {
          path: '/',
          validate: false,
          options: {
            timeout: {
              payload: 300000,
            },
          },
        },
        (context, req, res) => {
          return res.ok({
            body: {
              timeout: req.route.options.timeout,
            },
          });
        }
      );
      registerRouter(router);
      await server.start();
      await supertest(innerServer.listener)
        .post('/')
        .send({ test: 1 })
        .expect(200, {
          timeout: {
            payload: 300000,
          },
        });
    });

    test('DELETE routes set the payload timeout', async () => {
      const { registerRouter, server: innerServer } = await server.setup(config);

      const router = new Router('', logger, enhanceWithContext);
      router.delete(
        {
          path: '/',
          validate: false,
          options: {
            timeout: {
              payload: 300000,
            },
          },
        },
        (context, req, res) => {
          return res.ok({
            body: {
              timeout: req.route.options.timeout,
            },
          });
        }
      );
      registerRouter(router);
      await server.start();
      await supertest(innerServer.listener)
        .delete('/')
        .expect(200, {
          timeout: {
            payload: 300000,
          },
        });
    });

    test('PUT routes set the payload timeout and automatically adjusts the idle socket timeout', async () => {
      const { registerRouter, server: innerServer } = await server.setup(config);

      const router = new Router('', logger, enhanceWithContext);
      router.put(
        {
          path: '/',
          validate: false,
          options: {
            timeout: {
              payload: 300000,
            },
          },
        },
        (context, req, res) => {
          return res.ok({
            body: {
              timeout: req.route.options.timeout,
            },
          });
        }
      );
      registerRouter(router);
      await server.start();
      await supertest(innerServer.listener)
        .put('/')
        .expect(200, {
          timeout: {
            payload: 300000,
          },
        });
    });

    test('PATCH routes set the payload timeout and automatically adjusts the idle socket timeout', async () => {
      const { registerRouter, server: innerServer } = await server.setup(config);

      const router = new Router('', logger, enhanceWithContext);
      router.patch(
        {
          path: '/',
          validate: false,
          options: {
            timeout: {
              payload: 300000,
            },
          },
        },
        (context, req, res) => {
          return res.ok({
            body: {
              timeout: req.route.options.timeout,
            },
          });
        }
      );
      registerRouter(router);
      await server.start();
      await supertest(innerServer.listener)
        .patch('/')
        .expect(200, {
          timeout: {
            payload: 300000,
          },
        });
    });
  });

  describe('idleSocket timeout', () => {
    test('uses server socket timeout when not specified in the route', async () => {
      const { registerRouter, server: innerServer } = await server.setup({
        ...config,
        socketTimeout: 11000,
      });

      const router = new Router('', logger, enhanceWithContext);
      router.get(
        {
          path: '/',
          validate: { body: schema.maybe(schema.any()) },
        },
        (context, req, res) => {
          return res.ok({
            body: {
              timeout: req.route.options.timeout,
            },
          });
        }
      );
      registerRouter(router);

      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .send()
        .expect(200, {
          timeout: {
            idleSocket: 11000,
          },
        });
    });

    test('sets the socket timeout when specified in the route', async () => {
      const { registerRouter, server: innerServer } = await server.setup({
        ...config,
        socketTimeout: 11000,
      });

      const router = new Router('', logger, enhanceWithContext);
      router.get(
        {
          path: '/',
          validate: { body: schema.maybe(schema.any()) },
          options: { timeout: { idleSocket: 12000 } },
        },
        (context, req, res) => {
          return res.ok({
            body: {
              timeout: req.route.options.timeout,
            },
          });
        }
      );
      registerRouter(router);

      await server.start();
      await supertest(innerServer.listener)
        .get('/')
        .send()
        .expect(200, {
          timeout: {
            idleSocket: 12000,
          },
        });
    });

    test('idleSocket timeout can be smaller than the payload timeout', async () => {
      const { registerRouter } = await server.setup(config);

      const router = new Router('', logger, enhanceWithContext);
      router.post(
        {
          path: '/',
          validate: { body: schema.any() },
          options: {
            timeout: {
              payload: 1000,
              idleSocket: 10,
            },
          },
        },
        (context, req, res) => {
          return res.ok({ body: { timeout: req.route.options.timeout } });
        }
      );

      registerRouter(router);

      await server.start();
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
      expect(req.body).toBeInstanceOf(Readable);
      return res.ok({ body: req.route.options.body });
    }
  );
  registerRouter(router);

  await server.start();
  await supertest(innerServer.listener).put('/').send({ test: 1 }).expect(200, {
    parse: true,
    maxBytes: 1024, // hapi populates the default
    output: 'stream',
  });
});

test('closes sockets on timeout', async () => {
  const { registerRouter, server: innerServer } = await server.setup({
    ...config,
    socketTimeout: 1000,
  });
  const router = new Router('', logger, enhanceWithContext);

  router.get({ path: '/a', validate: false }, async (context, req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return res.ok({});
  });
  router.get({ path: '/b', validate: false }, (context, req, res) => res.ok({}));

  registerRouter(router);

  registerRouter(router);

  await server.start();

  expect(supertest(innerServer.listener).get('/a')).rejects.toThrow('socket hang up');

  await supertest(innerServer.listener).get('/b').expect(200);
});

describe('setup contract', () => {
  describe('#createSessionStorage', () => {
    test('creates session storage factory', async () => {
      const { createCookieSessionStorageFactory } = await server.setup(config);
      const sessionStorageFactory = await createCookieSessionStorageFactory(cookieOptions);

      expect(sessionStorageFactory.asScoped).toBeDefined();
    });

    test('creates session storage factory only once', async () => {
      const { createCookieSessionStorageFactory } = await server.setup(config);
      const create = async () => await createCookieSessionStorageFactory(cookieOptions);

      await create();
      expect(create()).rejects.toThrowError('A cookieSessionStorageFactory was already created');
    });

    test('does not throw if called after stop', async () => {
      const { createCookieSessionStorageFactory } = await server.setup(config);
      await server.stop();
      expect(() => {
        createCookieSessionStorageFactory(cookieOptions);
      }).not.toThrow();
    });
  });

  describe('#getServerInfo', () => {
    test('returns correct information', async () => {
      let { getServerInfo } = await server.setup(config);

      expect(getServerInfo()).toEqual({
        hostname: '127.0.0.1',
        name: 'kibana',
        port: 10002,
        protocol: 'http',
      });

      ({ getServerInfo } = await server.setup({
        ...config,
        port: 12345,
        name: 'custom-name',
        host: 'localhost',
      }));

      expect(getServerInfo()).toEqual({
        hostname: 'localhost',
        name: 'custom-name',
        port: 12345,
        protocol: 'http',
      });
    });

    test('returns correct protocol when ssl is enabled', async () => {
      const { getServerInfo } = await server.setup(configWithSSL);

      expect(getServerInfo().protocol).toEqual('https');
    });
  });

  describe('#registerStaticDir', () => {
    const assetFolder = join(__dirname, 'integration_tests', 'fixtures', 'static');
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await mkdtemp('cache-test');
    });

    afterAll(async () => {
      if (tempDir) {
        await rm(tempDir, { recursive: true });
      }
    });

    test('does not throw if called after stop', async () => {
      const { registerStaticDir } = await server.setup(config);
      await server.stop();
      expect(() => {
        registerStaticDir('/path1/{path*}', '/path/to/resource');
      }).not.toThrow();
    });

    test('returns correct headers for static assets', async () => {
      const { registerStaticDir, server: innerServer } = await server.setup(config);

      registerStaticDir('/static/{path*}', assetFolder);

      await server.start();
      const response = await supertest(innerServer.listener)
        .get('/static/some_json.json')
        .expect(200);

      expect(response.get('cache-control')).toEqual('must-revalidate');
      expect(response.get('etag')).not.toBeUndefined();
    });

    test('returns compressed version if present', async () => {
      const { registerStaticDir, server: innerServer } = await server.setup(config);

      registerStaticDir('/static/{path*}', assetFolder);

      await server.start();
      const response = await supertest(innerServer.listener)
        .get('/static/compression_available.json')
        .set('accept-encoding', 'gzip')
        .expect(200);

      expect(response.get('cache-control')).toEqual('must-revalidate');
      expect(response.get('etag')).not.toBeUndefined();
      expect(response.get('content-encoding')).toEqual('gzip');
    });

    test('returns uncompressed version if compressed asset is not available', async () => {
      const { registerStaticDir, server: innerServer } = await server.setup(config);

      registerStaticDir('/static/{path*}', assetFolder);

      await server.start();
      const response = await supertest(innerServer.listener)
        .get('/static/some_json.json')
        .set('accept-encoding', 'gzip')
        .expect(200);

      expect(response.get('cache-control')).toEqual('must-revalidate');
      expect(response.get('etag')).not.toBeUndefined();
      expect(response.get('content-encoding')).toBeUndefined();
    });

    test('returns a 304 if etag value matches', async () => {
      const { registerStaticDir, server: innerServer } = await server.setup(config);

      registerStaticDir('/static/{path*}', assetFolder);

      await server.start();
      const response = await supertest(innerServer.listener)
        .get('/static/some_json.json')
        .expect(200);

      const etag = response.get('etag');
      expect(etag).not.toBeUndefined();

      await supertest(innerServer.listener)
        .get('/static/some_json.json')
        .set('If-None-Match', etag)
        .expect(304);
    });

    test('serves content if etag values does not match', async () => {
      const { registerStaticDir, server: innerServer } = await server.setup(config);

      registerStaticDir('/static/{path*}', assetFolder);

      await server.start();

      await supertest(innerServer.listener)
        .get('/static/some_json.json')
        .set('If-None-Match', `"definitely not a valid etag"`)
        .expect(200);
    });

    test('dynamically updates depending on the content of the file', async () => {
      const tempFile = join(tempDir, 'some_file.json');

      const { registerStaticDir, server: innerServer } = await server.setup(config);
      registerStaticDir('/static/{path*}', tempDir);

      await server.start();

      await supertest(innerServer.listener).get('/static/some_file.json').expect(404);

      await writeFile(tempFile, `{ "over": 9000 }`);

      let response = await supertest(innerServer.listener)
        .get('/static/some_file.json')
        .expect(200);

      const etag1 = response.get('etag');

      await writeFile(tempFile, `{ "over": 42 }`);

      response = await supertest(innerServer.listener).get('/static/some_file.json').expect(200);

      const etag2 = response.get('etag');

      expect(etag1).not.toEqual(etag2);
    });
  });

  describe('#registerOnPreRouting', () => {
    test('does not throw if called after stop', async () => {
      const { registerOnPreRouting } = await server.setup(config);
      await server.stop();
      expect(() => {
        registerOnPreRouting((req, res) => res.unauthorized());
      }).not.toThrow();
    });
  });

  describe('#registerOnPreAuth', () => {
    test('does not throw if called after stop', async () => {
      const { registerOnPreAuth } = await server.setup(config);
      await server.stop();
      expect(() => {
        registerOnPreAuth((req, res) => res.unauthorized());
      }).not.toThrow();
    });
  });

  describe('#registerOnPostAuth', () => {
    test('does not throw if called after stop', async () => {
      const { registerOnPostAuth } = await server.setup(config);
      await server.stop();
      expect(() => {
        registerOnPostAuth((req, res) => res.unauthorized());
      }).not.toThrow();
    });
  });

  describe('#registerOnPreResponse', () => {
    test('does not throw if called after stop', async () => {
      const { registerOnPreResponse } = await server.setup(config);
      await server.stop();
      expect(() => {
        registerOnPreResponse((req, res, t) => t.next());
      }).not.toThrow();
    });
  });

  describe('#registerAuth', () => {
    test('does not throw if called after stop', async () => {
      const { registerAuth } = await server.setup(config);
      await server.stop();
      expect(() => {
        registerAuth((req, res) => res.unauthorized());
      }).not.toThrow();
    });
  });
});
