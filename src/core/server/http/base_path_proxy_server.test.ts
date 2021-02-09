/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BasePathProxyServer, BasePathProxyServerOptions } from './base_path_proxy_server';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { DevConfig } from '../dev/dev_config';
import { EMPTY } from 'rxjs';
import { HttpConfig } from './http_config';
import { ByteSizeValue, schema } from '@kbn/config-schema';
import {
  KibanaRequest,
  KibanaResponseFactory,
  Router,
  RouteValidationFunction,
  RouteValidationResultFactory,
} from './router';
import { HttpServer } from './http_server';
import supertest from 'supertest';
import { RequestHandlerContext } from 'kibana/server';
import { readFileSync } from 'fs';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { omit } from 'lodash';
import { Readable } from 'stream';

/**
 * Most of these tests are inspired by:
 * src/core/server/http/http_server.test.ts
 * and copied for completeness from that file. The modifications are that these tests use the developer proxy.
 */
describe('BasePathProxyServer', () => {
  let server: HttpServer;
  let proxyServer: BasePathProxyServer;
  let config: HttpConfig;
  let configWithSSL: HttpConfig;
  let basePath: string;
  let certificate: string;
  let key: string;
  let proxySupertest: supertest.SuperTest<supertest.Test>;
  const logger = loggingSystemMock.createLogger();
  const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

  beforeAll(() => {
    certificate = readFileSync(KBN_CERT_PATH, 'utf8');
    key = readFileSync(KBN_KEY_PATH, 'utf8');
  });

  beforeEach(async () => {
    // setup the server but don't start it until each individual test so that routes can be dynamically configured per unit test.
    server = new HttpServer(logger, 'tests');
    config = ({
      name: 'kibana',
      host: '127.0.0.1',
      port: 10012,
      compression: { enabled: true },
      requestId: {
        allowFromAnyIp: true,
        ipAllowlist: [],
      },
      autoListen: true,
      keepaliveTimeout: 1000,
      socketTimeout: 1000,
      cors: {
        enabled: false,
        allowCredentials: false,
        allowOrigin: [],
      },
      ssl: { enabled: false },
      customResponseHeaders: {},
      maxPayload: new ByteSizeValue(1024),
      rewriteBasePath: true,
    } as unknown) as HttpConfig;

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

    // setup and start the proxy server
    const proxyConfig: HttpConfig = { ...config, port: 10013 };
    const devConfig = new DevConfig({ basePathProxyTarget: config.port });
    proxyServer = new BasePathProxyServer(logger, proxyConfig, devConfig);
    const options: Readonly<BasePathProxyServerOptions> = {
      shouldRedirectFromOldBasePath: () => true,
      delayUntil: () => EMPTY,
    };
    await proxyServer.start(options);

    // set the base path or throw if for some unknown reason it is not setup
    if (proxyServer.basePath == null) {
      throw new Error('Invalid null base path, all tests will fail');
    } else {
      basePath = proxyServer.basePath;
    }
    proxySupertest = supertest(`http://127.0.0.1:${proxyConfig.port}`);
  });

  afterEach(async () => {
    await server.stop();
    await proxyServer.stop();
    jest.clearAllMocks();
  });

  test('root URL will return a 302 redirect', async () => {
    await proxySupertest.get('/').expect(302);
  });

  test('root URL will return a redirect location with exactly 3 characters that are a-z', async () => {
    const res = await proxySupertest.get('/');
    const location = res.header.location;
    expect(location).toMatch(/[a-z]{3}/);
  });

  test('valid params', async () => {
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);
    router.get(
      {
        path: '/{test}',
        validate: {
          params: schema.object({
            test: schema.string(),
          }),
        },
      },
      (_, req, res) => {
        return res.ok({ body: req.params.test });
      }
    );
    const { registerRouter } = await server.setup(config);
    registerRouter(router);
    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/some-string`)
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('some-string');
      });
  });

  test('invalid params', async () => {
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

    router.get(
      {
        path: '/{test}',
        validate: {
          params: schema.object({
            test: schema.number(),
          }),
        },
      },
      (_, req, res) => {
        return res.ok({ body: String(req.params.test) });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/some-string`)
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
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

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
      (_, req, res) => {
        return res.ok({ body: req.query });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/?bar=test&quux=123`)
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ bar: 'test', quux: 123 });
      });
  });

  test('invalid query', async () => {
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

    router.get(
      {
        path: '/',
        validate: {
          query: schema.object({
            bar: schema.number(),
          }),
        },
      },
      (_, req, res) => {
        return res.ok({ body: req.query });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/?bar=test`)
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
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

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
      (_, req, res) => {
        return res.ok({ body: req.body });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .post(`${basePath}/foo/`)
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
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

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
      (_, req, res) => {
        return res.ok({ body: req.body });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .post(`${basePath}/foo/`)
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
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

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
      (_, req, res) => {
        return res.ok({ body: req.body });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .post(`${basePath}/foo/`)
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
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

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
      (_, req, res) => {
        return res.ok({ body: req.body });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .post(`${basePath}/foo/`)
      .send({
        bar: 'test',
        baz: 123,
      })
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ bar: 'test', baz: 123 });
      });
  });

  test('not inline handler - KibanaRequest', async () => {
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

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

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .post(`${basePath}/foo/`)
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
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

    router.post(
      {
        path: '/',
        validate: {
          body: schema.object({
            bar: schema.number(),
          }),
        },
      },
      (_, req, res) => {
        return res.ok({ body: req.body });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .post(`${basePath}/foo/`)
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
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

    router.put(
      {
        path: '/',
        validate: {
          body: schema.object({
            key: schema.string(),
          }),
        },
      },
      (_, req, res) => {
        return res.ok({ body: req.body });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .put(`${basePath}/foo/`)
      .send({ key: 'new value' })
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ key: 'new value' });
      });
  });

  test('handles deleting', async () => {
    const router = new Router(`${basePath}/foo`, logger, enhanceWithContext);

    router.delete(
      {
        path: '/{id}',
        validate: {
          params: schema.object({
            id: schema.number(),
          }),
        },
      },
      (_, req, res) => {
        return res.ok({ body: { key: req.params.id } });
      }
    );

    const { registerRouter } = await server.setup(config);
    registerRouter(router);

    await server.start();

    await proxySupertest
      .delete(`${basePath}/foo/3`)
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ key: 3 });
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

      const router = new Router(`${basePath}/`, logger, enhanceWithContext);
      router.get({ path: '/', validate: false }, (_, __, res) => res.ok({ body: 'value:/' }));
      router.get({ path: '/foo', validate: false }, (_, __, res) => res.ok({ body: 'value:/foo' }));

      const { registerRouter } = await server.setup(configWithBasePath);
      registerRouter(router);

      await server.start();
    });

    test('/bar => 404', async () => {
      await proxySupertest.get(`${basePath}/bar`).expect(404);
    });

    test('/bar/ => 404', async () => {
      await proxySupertest.get(`${basePath}/bar/`).expect(404);
    });

    test('/bar/foo => 404', async () => {
      await proxySupertest.get(`${basePath}/bar/foo`).expect(404);
    });

    test('/ => /', async () => {
      await proxySupertest
        .get(`${basePath}/`)
        .expect(200)
        .then((res) => {
          expect(res.text).toBe('value:/');
        });
    });

    test('/foo => /foo', async () => {
      await proxySupertest
        .get(`${basePath}/foo`)
        .expect(200)
        .then((res) => {
          expect(res.text).toBe('value:/foo');
        });
    });
  });

  test('with defined `redirectHttpFromPort`', async () => {
    const router = new Router(`${basePath}/`, logger, enhanceWithContext);
    router.get({ path: '/', validate: false }, (_, __, res) => res.ok({ body: 'value:/' }));

    const { registerRouter } = await server.setup(configWithSSL);
    registerRouter(router);

    await server.start();
  });

  test('allows attaching metadata to attach meta-data tag strings to a route', async () => {
    const tags = ['my:tag'];
    const { registerRouter } = await server.setup(config);

    const router = new Router(basePath, logger, enhanceWithContext);
    router.get({ path: '/with-tags', validate: false, options: { tags } }, (_, req, res) =>
      res.ok({ body: { tags: req.route.options.tags } })
    );
    router.get({ path: '/without-tags', validate: false }, (_, req, res) =>
      res.ok({ body: { tags: req.route.options.tags } })
    );
    registerRouter(router);

    await server.start();
    await proxySupertest.get(`${basePath}/with-tags`).expect(200, { tags });

    await proxySupertest.get(`${basePath}/without-tags`).expect(200, { tags: [] });
  });

  describe('response headers', () => {
    test('default headers', async () => {
      const { registerRouter } = await server.setup(config);

      const router = new Router(basePath, logger, enhanceWithContext);
      router.get({ path: '/', validate: false }, (_, req, res) => res.ok({ body: req.route }));
      registerRouter(router);

      await server.start();
      const response = await proxySupertest.get(`${basePath}/`).expect(200);

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
    const { registerRouter } = await server.setup(config);

    const router = new Router(basePath, logger, enhanceWithContext);
    router.post(
      {
        path: '/',
        validate: { body: schema.object({ test: schema.number() }) },
        options: { body: { accepts: 'application/json' } },
      },
      (_, req, res) => res.ok({ body: req.route })
    );
    registerRouter(router);

    await server.start();
    await proxySupertest
      .post(`${basePath}/`)
      .send({ test: 1 })
      .expect(200, {
        method: 'post',
        path: `${basePath}/`,
        options: {
          authRequired: true,
          xsrfRequired: true,
          tags: [],
          timeout: {
            payload: 10000,
            idleSocket: 1000,
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

  test('should return a stream in the body', async () => {
    const { registerRouter } = await server.setup(config);

    const router = new Router(basePath, logger, enhanceWithContext);
    router.put(
      {
        path: '/',
        validate: { body: schema.stream() },
        options: { body: { output: 'stream' } },
      },
      (_, req, res) => {
        expect(req.body).toBeInstanceOf(Readable);
        return res.ok({ body: req.route.options.body });
      }
    );
    registerRouter(router);

    await server.start();
    await proxySupertest.put(`${basePath}/`).send({ test: 1 }).expect(200, {
      parse: true,
      maxBytes: 1024, // hapi populates the default
      output: 'stream',
    });
  });

  describe('timeout options', () => {
    describe('payload timeout', () => {
      test('POST routes set the payload timeout', async () => {
        const { registerRouter } = await server.setup(config);

        const router = new Router(basePath, logger, enhanceWithContext);
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
          (_, req, res) => {
            return res.ok({
              body: {
                timeout: req.route.options.timeout,
              },
            });
          }
        );
        registerRouter(router);
        await server.start();
        await proxySupertest
          .post(`${basePath}/`)
          .send({ test: 1 })
          .expect(200, {
            timeout: {
              payload: 300000,
              idleSocket: 1000, // This is an extra option added by the proxy
            },
          });
      });

      test('DELETE routes set the payload timeout', async () => {
        const { registerRouter } = await server.setup(config);

        const router = new Router(basePath, logger, enhanceWithContext);
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
        await proxySupertest.delete(`${basePath}/`).expect(200, {
          timeout: {
            payload: 300000,
            idleSocket: 1000, // This is an extra option added by the proxy
          },
        });
      });

      test('PUT routes set the payload timeout and automatically adjusts the idle socket timeout', async () => {
        const { registerRouter } = await server.setup(config);

        const router = new Router(basePath, logger, enhanceWithContext);
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
          (_, req, res) => {
            return res.ok({
              body: {
                timeout: req.route.options.timeout,
              },
            });
          }
        );
        registerRouter(router);
        await server.start();
        await proxySupertest.put(`${basePath}/`).expect(200, {
          timeout: {
            payload: 300000,
            idleSocket: 1000, // This is an extra option added by the proxy
          },
        });
      });

      test('PATCH routes set the payload timeout and automatically adjusts the idle socket timeout', async () => {
        const { registerRouter } = await server.setup(config);

        const router = new Router(basePath, logger, enhanceWithContext);
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
          (_, req, res) => {
            return res.ok({
              body: {
                timeout: req.route.options.timeout,
              },
            });
          }
        );
        registerRouter(router);
        await server.start();
        await proxySupertest.patch(`${basePath}/`).expect(200, {
          timeout: {
            payload: 300000,
            idleSocket: 1000, // This is an extra option added by the proxy
          },
        });
      });
    });

    describe('idleSocket timeout', () => {
      test('uses server socket timeout when not specified in the route', async () => {
        const { registerRouter } = await server.setup({
          ...config,
          socketTimeout: 11000,
        });

        const router = new Router(basePath, logger, enhanceWithContext);
        router.get(
          {
            path: '/',
            validate: { body: schema.maybe(schema.any()) },
          },
          (_, req, res) => {
            return res.ok({
              body: {
                timeout: req.route.options.timeout,
              },
            });
          }
        );
        registerRouter(router);

        await server.start();
        await proxySupertest
          .get(`${basePath}/`)
          .send()
          .expect(200, {
            timeout: {
              idleSocket: 11000,
            },
          });
      });

      test('sets the socket timeout when specified in the route', async () => {
        const { registerRouter } = await server.setup({
          ...config,
          socketTimeout: 11000,
        });

        const router = new Router(basePath, logger, enhanceWithContext);
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
        await proxySupertest
          .get(`${basePath}/`)
          .send()
          .expect(200, {
            timeout: {
              idleSocket: 12000,
            },
          });
      });

      test('idleSocket timeout can be smaller than the payload timeout', async () => {
        const { registerRouter } = await server.setup(config);

        const router = new Router(basePath, logger, enhanceWithContext);
        router.post(
          {
            path: `${basePath}/`,
            validate: { body: schema.any() },
            options: {
              timeout: {
                payload: 1000,
                idleSocket: 10,
              },
            },
          },
          (_, req, res) => {
            return res.ok({ body: { timeout: req.route.options.timeout } });
          }
        );

        registerRouter(router);

        await server.start();
      });
    });
  });

  describe('shouldRedirect', () => {
    let proxyServerWithoutShouldRedirect: BasePathProxyServer;
    let proxyWithoutShouldRedirectSupertest: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
      // setup and start a proxy server which does not use "shouldRedirectFromOldBasePath"
      const proxyConfig: HttpConfig = { ...config, port: 10004 };
      const devConfig = new DevConfig({ basePathProxyTarget: config.port });
      proxyServerWithoutShouldRedirect = new BasePathProxyServer(logger, proxyConfig, devConfig);
      const options: Readonly<BasePathProxyServerOptions> = {
        shouldRedirectFromOldBasePath: () => false, // Return false to not redirect
        delayUntil: () => EMPTY,
      };
      await proxyServerWithoutShouldRedirect.start(options);
      proxyWithoutShouldRedirectSupertest = supertest(`http://127.0.0.1:${proxyConfig.port}`);
    });

    afterEach(async () => {
      await proxyServerWithoutShouldRedirect.stop();
    });

    test('it will do a redirect if it detects what looks like a stale or previously used base path', async () => {
      const fakeBasePath = basePath !== 'abc' ? 'abc' : 'efg';
      const res = await proxySupertest.get(`/${fakeBasePath}`).expect(302);
      const location = res.header.location;
      expect(location).toEqual(`${basePath}/`);
    });

    test('it will NOT do a redirect if it detects what looks like a stale or previously used base path if we intentionally turn it off', async () => {
      const fakeBasePath = basePath !== 'abc' ? 'abc' : 'efg';
      await proxyWithoutShouldRedirectSupertest.get(`/${fakeBasePath}`).expect(404);
    });

    test('it will NOT redirect if it detects a larger path than 3 characters', async () => {
      await proxySupertest.get('/abcde').expect(404);
    });

    test('it will NOT redirect if it is not a GET verb', async () => {
      const fakeBasePath = basePath !== 'abc' ? 'abc' : 'efg';
      await proxySupertest.put(`/${fakeBasePath}`).expect(404);
    });
  });

  describe('constructor option for sending in a custom basePath', () => {
    let proxyServerWithFooBasePath: BasePathProxyServer;
    let proxyWithFooBasePath: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
      // setup and start a proxy server which uses a basePath of "foo"
      const proxyConfig: HttpConfig = { ...config, port: 10004, basePath: '/foo' }; // <-- "foo" here in basePath
      const devConfig = new DevConfig({ basePathProxyTarget: config.port });
      proxyServerWithFooBasePath = new BasePathProxyServer(logger, proxyConfig, devConfig);
      const options: Readonly<BasePathProxyServerOptions> = {
        shouldRedirectFromOldBasePath: () => true,
        delayUntil: () => EMPTY,
      };
      await proxyServerWithFooBasePath.start(options);
      proxyWithFooBasePath = supertest(`http://127.0.0.1:${proxyConfig.port}`);
    });

    afterEach(async () => {
      await proxyServerWithFooBasePath.stop();
    });

    test('it will do a redirect to foo which is our passed in value for the configuration', async () => {
      const res = await proxyWithFooBasePath.get('/bar').expect(302);
      const location = res.header.location;
      expect(location).toEqual('/foo/');
    });
  });
});
