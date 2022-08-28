/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import * as kbnTestServer from '../../../test_helpers/kbn_server';

describe('request logging', () => {
  let mockConsoleLog: jest.SpyInstance;

  beforeAll(() => {
    mockConsoleLog = jest.spyOn(global.console, 'log');
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('http server response logging', () => {
    describe('configuration', () => {
      it('does not log with a default config', async () => {
        const root = kbnTestServer.createRoot({
          plugins: { initialize: false },
          elasticsearch: { skipStartupConnectionCheck: true },
        });
        await root.preboot();
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/ping', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        await kbnTestServer.request.get(root, '/ping').expect(200, 'pong');
        expect(mockConsoleLog).not.toHaveBeenCalled();

        await root.shutdown();
      });

      it('logs at the correct level and with the correct context', async () => {
        const root = kbnTestServer.createRoot({
          logging: {
            appenders: {
              'test-console': {
                type: 'console',
                layout: {
                  type: 'pattern',
                  pattern: '%level|%logger|%message|%meta',
                },
              },
            },
            loggers: [
              {
                name: 'http.server.response',
                appenders: ['test-console'],
                level: 'debug',
              },
            ],
          },
          plugins: {
            initialize: false,
          },
          elasticsearch: { skipStartupConnectionCheck: true },
        });
        await root.preboot();
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/ping', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        await kbnTestServer.request.get(root, '/ping').expect(200, 'pong');
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [level, logger] = mockConsoleLog.mock.calls[0][0].split('|');
        expect(level).toBe('DEBUG');
        expect(logger).toBe('http.server.response');

        await root.shutdown();
      });
    });

    describe('content', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      const config = {
        logging: {
          appenders: {
            'test-console': {
              type: 'console',
              layout: {
                type: 'pattern',
                pattern: '%level|%logger|%message|%meta',
              },
            },
          },
          loggers: [
            {
              name: 'http.server.response',
              appenders: ['test-console'],
              level: 'debug',
            },
          ],
        },
        plugins: {
          initialize: false,
        },
        elasticsearch: { skipStartupConnectionCheck: true },
      };

      beforeEach(() => {
        root = kbnTestServer.createRoot(config);
      });

      afterEach(async () => {
        await root.shutdown();
      });

      it('handles a GET request', async () => {
        await root.preboot();
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/ping', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        await kbnTestServer.request.get(root, '/ping').expect(200, 'pong');
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [, , message, meta] = mockConsoleLog.mock.calls[0][0].split('|');
        // some of the contents of the message are variable based on environment, such as
        // response time, so we are only performing assertions against parts of the string
        expect(message.includes('GET /ping 200')).toBe(true);
        expect(JSON.parse(meta).http.request.method).toBe('GET');
        expect(JSON.parse(meta).url.path).toBe('/ping');
        expect(JSON.parse(meta).http.response.status_code).toBe(200);
      });

      it('handles a POST request', async () => {
        await root.preboot();
        const { http } = await root.setup();

        http.createRouter('/').post(
          {
            path: '/ping',
            validate: {
              body: schema.object({ message: schema.string() }),
            },
            options: {
              authRequired: 'optional',
              body: {
                accepts: ['application/json'],
              },
              timeout: { payload: 100 },
            },
          },
          (context, req, res) => res.ok({ body: { message: req.body.message } })
        );
        await root.start();

        await kbnTestServer.request
          .post(root, '/ping')
          .set('Content-Type', 'application/json')
          .send({ message: 'hi' })
          .expect(200);
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [, , message] = mockConsoleLog.mock.calls[0][0].split('|');
        expect(message.includes('POST /ping 200')).toBe(true);
      });

      it('handles an error response', async () => {
        await root.preboot();
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/a', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        await kbnTestServer.request.get(root, '/b').expect(404);
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [, , message, meta] = mockConsoleLog.mock.calls[0][0].split('|');
        // some of the contents of the message are variable based on environment, such as
        // response time, so we are only performing assertions against parts of the string
        expect(message.includes('GET /b 404')).toBe(true);
        expect(JSON.parse(meta).http.response.status_code).toBe(404);
      });

      it('handles query strings', async () => {
        await root.preboot();
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/ping', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        await kbnTestServer.request.get(root, '/ping').query({ hey: 'ya' }).expect(200, 'pong');
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [, , message, meta] = mockConsoleLog.mock.calls[0][0].split('|');
        expect(message.includes('GET /ping?hey=ya 200')).toBe(true);
        expect(JSON.parse(meta).url.query).toBe('hey=ya');
      });

      it('correctly calculates response payload', async () => {
        await root.preboot();
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/ping', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        const response = await kbnTestServer.request.get(root, '/ping').expect(200, 'pong');
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
        expect(JSON.parse(meta).http.response.body.bytes).toBe(response.text.length);
      });

      describe('handles request/response headers', () => {
        it('includes request/response headers in log entry', async () => {
          await root.preboot();
          const { http } = await root.setup();

          http
            .createRouter('/')
            .get(
              { path: '/ping', validate: false, options: { authRequired: 'optional' } },
              (context, req, res) => res.ok({ headers: { bar: 'world' }, body: 'pong' })
            );
          await root.start();

          await kbnTestServer.request.get(root, '/ping').set('foo', 'hello').expect(200);
          expect(mockConsoleLog).toHaveBeenCalledTimes(1);
          const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
          expect(JSON.parse(meta).http.request.headers.foo).toBe('hello');
          expect(JSON.parse(meta).http.response.headers.bar).toBe('world');
        });

        it('filters sensitive request headers by default', async () => {
          await root.preboot();
          const { http } = await root.setup();

          http.createRouter('/').post(
            {
              path: '/ping',
              validate: {
                body: schema.object({ message: schema.string() }),
              },
              options: {
                authRequired: 'optional',
                body: {
                  accepts: ['application/json'],
                },
                timeout: { payload: 100 },
              },
            },
            (context, req, res) => res.ok({ body: { message: req.body.message } })
          );
          await root.start();

          await kbnTestServer.request
            .post(root, '/ping')
            .set('content-type', 'application/json')
            .set('authorization', 'abc')
            .send({ message: 'hi' })
            .expect(200);
          expect(mockConsoleLog).toHaveBeenCalledTimes(1);
          const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
          expect(JSON.parse(meta).http.request.headers.authorization).toBe('[REDACTED]');
        });

        it('filters sensitive request headers when RewriteAppender is configured', async () => {
          root = kbnTestServer.createRoot({
            logging: {
              appenders: {
                'test-console': {
                  type: 'console',
                  layout: {
                    type: 'pattern',
                    pattern: '%level|%logger|%message|%meta',
                  },
                },
                rewrite: {
                  type: 'rewrite',
                  appenders: ['test-console'],
                  policy: {
                    type: 'meta',
                    mode: 'update',
                    properties: [
                      { path: 'http.request.headers.authorization', value: '[REDACTED]' },
                    ],
                  },
                },
              },
              loggers: [
                {
                  name: 'http.server.response',
                  appenders: ['rewrite'],
                  level: 'debug',
                },
              ],
            },
            plugins: {
              initialize: false,
            },
            elasticsearch: { skipStartupConnectionCheck: true },
          });
          await root.preboot();
          const { http } = await root.setup();

          http.createRouter('/').post(
            {
              path: '/ping',
              validate: {
                body: schema.object({ message: schema.string() }),
              },
              options: {
                authRequired: 'optional',
                body: {
                  accepts: ['application/json'],
                },
                timeout: { payload: 100 },
              },
            },
            (context, req, res) => res.ok({ body: { message: req.body.message } })
          );
          await root.start();

          await kbnTestServer.request
            .post(root, '/ping')
            .set('content-type', 'application/json')
            .set('authorization', 'abc')
            .send({ message: 'hi' })
            .expect(200);
          expect(mockConsoleLog).toHaveBeenCalledTimes(1);
          const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
          expect(JSON.parse(meta).http.request.headers.authorization).toBe('[REDACTED]');
        });

        it('filters sensitive response headers by defaut', async () => {
          await root.preboot();
          const { http } = await root.setup();

          http.createRouter('/').post(
            {
              path: '/ping',
              validate: {
                body: schema.object({ message: schema.string() }),
              },
              options: {
                authRequired: 'optional',
                body: {
                  accepts: ['application/json'],
                },
                timeout: { payload: 100 },
              },
            },
            (context, req, res) =>
              res.ok({ headers: { 'set-cookie': ['123'] }, body: { message: req.body.message } })
          );
          await root.start();

          await kbnTestServer.request
            .post(root, '/ping')
            .set('Content-Type', 'application/json')
            .send({ message: 'hi' })
            .expect(200);
          expect(mockConsoleLog).toHaveBeenCalledTimes(1);
          const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
          expect(JSON.parse(meta).http.response.headers['set-cookie']).toBe('[REDACTED]');
        });

        it('filters sensitive response headers when RewriteAppender is configured', async () => {
          root = kbnTestServer.createRoot({
            logging: {
              appenders: {
                'test-console': {
                  type: 'console',
                  layout: {
                    type: 'pattern',
                    pattern: '%level|%logger|%message|%meta',
                  },
                },
                rewrite: {
                  type: 'rewrite',
                  appenders: ['test-console'],
                  policy: {
                    type: 'meta',
                    mode: 'update',
                    properties: [{ path: 'http.response.headers.set-cookie', value: '[REDACTED]' }],
                  },
                },
              },
              loggers: [
                {
                  name: 'http.server.response',
                  appenders: ['rewrite'],
                  level: 'debug',
                },
              ],
            },
            plugins: {
              initialize: false,
            },
            elasticsearch: { skipStartupConnectionCheck: true },
          });
          await root.preboot();
          const { http } = await root.setup();

          http.createRouter('/').post(
            {
              path: '/ping',
              validate: {
                body: schema.object({ message: schema.string() }),
              },
              options: {
                authRequired: 'optional',
                body: {
                  accepts: ['application/json'],
                },
                timeout: { payload: 100 },
              },
            },
            (context, req, res) =>
              res.ok({ headers: { 'set-cookie': ['123'] }, body: { message: req.body.message } })
          );
          await root.start();

          await kbnTestServer.request
            .post(root, '/ping')
            .set('Content-Type', 'application/json')
            .send({ message: 'hi' })
            .expect(200);
          expect(mockConsoleLog).toHaveBeenCalledTimes(1);
          const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
          expect(JSON.parse(meta).http.response.headers['set-cookie']).toBe('[REDACTED]');
        });
      });

      it('handles user agent', async () => {
        await root.preboot();
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/ping', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        await kbnTestServer.request.get(root, '/ping').set('user-agent', 'world').expect(200);
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
        expect(JSON.parse(meta).http.request.headers['user-agent']).toBe('world');
        expect(JSON.parse(meta).user_agent.original).toBe('world');
      });
    });
  });
});
