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
import { Stream } from 'stream';
import Boom from 'boom';

import supertest from 'supertest';
import { BehaviorSubject } from 'rxjs';
import { ByteSizeValue, schema } from '@kbn/config-schema';

import { CoreContext } from '../../core_context';
import { HttpService } from '../http_service';

import { Env } from '../../config';
import { getEnvOptions } from '../../config/__mocks__/env';
import { configServiceMock } from '../../config/config_service.mock';
import { loggingServiceMock } from '../../logging/logging_service.mock';

let server: HttpService;

let logger: ReturnType<typeof loggingServiceMock.create>;
let env: Env;
let coreContext: CoreContext;
const configService = configServiceMock.create();

configService.atPath.mockReturnValue(
  new BehaviorSubject({
    hosts: ['http://1.2.3.4'],
    maxPayload: new ByteSizeValue(1024),
    autoListen: true,
    healthCheck: {
      delay: 2000,
    },
    ssl: {
      enabled: false,
      verificationMode: 'none',
    },
  } as any)
);

beforeEach(() => {
  logger = loggingServiceMock.create();
  env = Env.createDefault(getEnvOptions());

  coreContext = { env, logger, configService: configService as any };
  server = new HttpService(coreContext);
});

afterEach(async () => {
  await server.stop();
});

describe('Handler', () => {
  it("Doesn't expose error details if handler throws", async () => {
    const { registerRouter, server: innerServer, createRouter } = await server.setup();
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => {
      throw new Error('unexpected error');
    });

    registerRouter(router);
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: unexpected error],
          ],
        ]
    `);
  });

  it('returns 500 Server error if handler throws Boom error', async () => {
    const { registerRouter, server: innerServer, createRouter } = await server.setup();
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => {
      throw Boom.unauthorized();
    });

    registerRouter(router);
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unauthorized],
        ],
      ]
    `);
  });

  it('returns 500 Server error if handler returns unexpected result', async () => {
    const { registerRouter, server: innerServer, createRouter } = await server.setup();

    const router = createRouter('/');
    router.get({ path: '/', validate: false }, (context, req, res) => 'ok' as any);

    registerRouter(router);
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from Route Handler. Expected KibanaResponse, but given: string.],
        ],
      ]
    `);
  });

  it('returns 400 Bad request if request validation failed', async () => {
    const { registerRouter, server: innerServer, createRouter } = await server.setup();
    const router = createRouter('/');

    router.get(
      {
        path: '/',
        validate: {
          query: schema.object({
            page: schema.number(),
          }),
        },
      },
      (context, req, res) => res.noContent()
    );

    registerRouter(router);
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .query({ page: 'one' })
      .expect(400);

    expect(result.body).toEqual({
      error: '[request query.page]: expected value of type [number] but got [string]',
    });
  });
});

describe('Response factory', () => {
  describe('Success', () => {
    it('supports answering with json object', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({ key: 'value' });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.body).toEqual({ key: 'value' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('supports answering with string', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok('result');
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toBe('result');
      expect(result.header['content-type']).toBe('text/html; charset=utf-8');
    });

    it('supports answering with undefined', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok(undefined);
      });

      registerRouter(router);
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(200);
    });

    it('supports answering with Stream', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const stream = new Stream.Readable({
          read() {
            this.push('a');
            this.push('b');
            this.push('c');
            this.push(null);
          },
        });

        return res.ok(stream);
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toBe('abc');
      expect(result.header['content-type']).toBe(undefined);
    });

    it('supports answering with chunked Stream', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const stream = new Stream.PassThrough();
        stream.write('a');
        stream.write('b');
        setTimeout(function() {
          stream.write('c');
          stream.end();
        }, 100);

        return res.ok(stream);
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toBe('abc');
      expect(result.header['transfer-encoding']).toBe('chunked');
    });

    it('supports answering with Buffer', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const buffer = Buffer.alloc(1028, '.');

        return res.ok(buffer, {
          headers: {
            'content-encoding': 'binary',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200)
        .buffer(true);

      expect(result.header['content-encoding']).toBe('binary');
      expect(result.header['content-length']).toBe('1028');
      expect(result.header['content-type']).toBe('application/octet-stream');
    });

    it('supports answering with Buffer text', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const buffer = new Buffer('abc');

        return res.ok(buffer, {
          headers: {
            'content-type': 'text/plain',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200)
        .buffer(true);

      expect(result.text).toBe('abc');
      expect(result.header['content-length']).toBe('3');
      expect(result.header['content-type']).toBe('text/plain; charset=utf-8');
    });

    it('supports configuring standard headers', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok('value', {
          headers: {
            etag: '1234',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toEqual('value');
      expect(result.header.etag).toBe('1234');
    });

    it('supports configuring non-standard headers', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok('value', {
          headers: {
            etag: '1234',
            'x-kibana': 'key',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toEqual('value');
      expect(result.header.etag).toBe('1234');
      expect(result.header['x-kibana']).toBe('key');
    });

    it('accepted headers are case-insensitive.', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok('value', {
          headers: {
            ETag: '1234',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.header.etag).toBe('1234');
    });

    it('accept array of headers', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok('value', {
          headers: {
            'set-cookie': ['foo', 'bar'],
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.header['set-cookie']).toEqual(['foo', 'bar']);
    });

    it('throws if given invalid json object as response payload', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const payload: any = { key: {} };
        payload.key.payload = payload;
        return res.ok(payload);
      });

      registerRouter(router);
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      // error happens within hapi when route handler already finished execution.
      expect(loggingServiceMock.collect(logger).error).toHaveLength(0);
    });

    it('200 OK with body', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({ key: 'value' });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.body).toEqual({ key: 'value' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('202 Accepted with body', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.accepted({ location: 'somewhere' });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(202);

      expect(result.body).toEqual({ location: 'somewhere' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('204 No content', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.noContent();
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(204);

      expect(result.noContent).toBe(true);
    });
  });

  describe('Redirection', () => {
    it('302 supports redirection to configured URL', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.redirected('The document has moved', {
          headers: {
            location: '/new-url',
            'x-kibana': 'tag',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(302);

      expect(result.text).toBe('The document has moved');
      expect(result.header.location).toBe('/new-url');
      expect(result.header['x-kibana']).toBe('tag');
    });

    it('throws if redirection url not provided', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.redirected(undefined, {
          headers: {
            'x-kibana': 'tag',
          },
        } as any); // location headers is required
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.error).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: expected 'location' header to be set],
          ],
        ]
      `);
    });
  });

  describe('Error', () => {
    it('400 Bad request', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('some message');
        return res.badRequest(error);
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(result.body).toEqual({ error: 'some message' });
    });

    it('400 Bad request with default message', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.badRequest();
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(result.body).toEqual({ error: 'Bad Request' });
    });

    it('400 Bad request with additional data', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.badRequest({ message: 'some message', meta: { data: ['good', 'bad'] } });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(result.body).toEqual({
        error: 'some message',
        meta: {
          data: ['good', 'bad'],
        },
      });
    });

    it('401 Unauthorized', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('no access');
        return res.unauthorized(error, {
          headers: {
            'WWW-Authenticate': 'challenge',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.error).toBe('no access');
      expect(result.header['www-authenticate']).toBe('challenge');
    });

    it('401 Unauthorized with default message', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.unauthorized();
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.error).toBe('Unauthorized');
    });

    it('403 Forbidden', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('reason');
        return res.forbidden(error);
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(403);

      expect(result.body.error).toBe('reason');
    });

    it('403 Forbidden with default message', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.forbidden();
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(403);

      expect(result.body.error).toBe('Forbidden');
    });

    it('404 Not Found', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('file is not found');
        return res.notFound(error);
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(404);

      expect(result.body.error).toBe('file is not found');
    });

    it('404 Not Found with default message', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.notFound();
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(404);

      expect(result.body.error).toBe('Not Found');
    });

    it('409 Conflict', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('stale version');
        return res.conflict(error);
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(409);

      expect(result.body.error).toBe('stale version');
    });

    it('409 Conflict with default message', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.conflict();
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(409);

      expect(result.body.error).toBe('Conflict');
    });
  });

  describe('Custom', () => {
    it('creates success response', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom(undefined, {
          statusCode: 201,
          headers: {
            location: 'somewhere',
          },
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(201);

      expect(result.header.location).toBe('somewhere');
    });

    it('creates redirect response', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom('The document has moved', {
          headers: {
            location: '/new-url',
          },
          statusCode: 301,
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(301);

      expect(result.header.location).toBe('/new-url');
    });

    it('throws if redirects without location header to be set', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom('The document has moved', {
          headers: {},
          statusCode: 301,
        });
      });

      registerRouter(router);
      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: expected 'location' header to be set],
          ],
        ]
      `);
    });

    it('creates error response', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('unauthorized');
        return res.custom(error, {
          statusCode: 401,
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.error).toBe('unauthorized');
    });

    it('creates error response with additional data', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom(
          {
            message: 'unauthorized',
            meta: { errorCode: 'K401' },
          },
          {
            statusCode: 401,
          }
        );
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body).toEqual({
        error: 'unauthorized',
        meta: { errorCode: 'K401' },
      });
    });

    it('creates error response with additional data and error object', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom(
          {
            message: new Error('unauthorized'),
            meta: { errorCode: 'K401' },
          },
          {
            statusCode: 401,
          }
        );
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body).toEqual({
        error: 'unauthorized',
        meta: { errorCode: 'K401' },
      });
    });

    it('creates error response with Boom error', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = Boom.unauthorized();
        return res.custom(error, {
          statusCode: 401,
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.error).toBe('Unauthorized');
    });

    it("Doesn't log details of created 500 Server error response", async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom('reason', {
          statusCode: 500,
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.error).toBe('reason');
      expect(loggingServiceMock.collect(logger).error).toHaveLength(0);
    });

    it('throws an error if not valid error is provided', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom(
          { error: 'error-message' },
          {
            statusCode: 401,
          }
        );
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.error).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: expected error message to be provided],
          ],
        ]
      `);
    });

    it('throws if an error not provided', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom(undefined, {
          statusCode: 401,
        });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.error).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: expected error message to be provided],
          ],
        ]
      `);
    });

    it('throws an error if statusCode is not specified', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('error message');
        return res.custom(error, undefined as any); // options.statusCode is required
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.error).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: options.statusCode is expected to be set. given options: undefined],
          ],
        ]
      `);
    });

    it('throws an error if statusCode is not valid', async () => {
      const { registerRouter, server: innerServer, createRouter } = await server.setup();
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('error message');
        return res.custom(error, { statusCode: 20 });
      });

      registerRouter(router);
      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.error).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: Unexpected Http status code. Expected from 100 to 599, but given: 20.],
          ],
        ]
      `);
    });
  });
});
