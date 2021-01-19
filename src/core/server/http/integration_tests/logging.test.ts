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
        const root = kbnTestServer.createRoot({ plugins: { initialize: false } });
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
            silent: true,
            appenders: {
              'test-console': {
                kind: 'console',
                layout: {
                  kind: 'pattern',
                  pattern: '%level|%logger|%message|%meta',
                },
              },
            },
            root: {
              appenders: ['test-console', 'default'],
              level: 'warn',
            },
            loggers: [
              {
                context: 'http.server.Kibana.response',
                appenders: ['test-console'],
                level: 'debug',
              },
            ],
          },
          plugins: {
            initialize: false,
          },
        });
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
        expect(logger).toBe('http.server.Kibana.response');

        await root.shutdown();
      });
    });

    describe('content', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      const config = {
        logging: {
          silent: true,
          appenders: {
            'test-console': {
              kind: 'console',
              layout: {
                kind: 'pattern',
                pattern: '%level|%logger|%message|%meta',
              },
            },
          },
          root: {
            appenders: ['test-console', 'default'],
            level: 'warn',
          },
          loggers: [
            {
              context: 'http.server.Kibana.response',
              appenders: ['test-console'],
              level: 'debug',
            },
          ],
        },
        plugins: {
          initialize: false,
        },
      };

      beforeEach(() => {
        root = kbnTestServer.createRoot(config);
      });

      afterEach(async () => {
        await root.shutdown();
      });

      it('handles a GET request', async () => {
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

      it('handles request headers', async () => {
        const { http } = await root.setup();

        http
          .createRouter('/')
          .get(
            { path: '/ping', validate: false, options: { authRequired: 'optional' } },
            (context, req, res) => res.ok({ body: 'pong' })
          );
        await root.start();

        await kbnTestServer.request.get(root, '/ping').set('foo', 'hello').expect(200);
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const [, , , meta] = mockConsoleLog.mock.calls[0][0].split('|');
        expect(JSON.parse(meta).http.request.headers.foo).toBe('hello');
      });

      it('handles user agent', async () => {
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
