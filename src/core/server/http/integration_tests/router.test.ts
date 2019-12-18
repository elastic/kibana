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
import { schema } from '@kbn/config-schema';

import { HttpService } from '../http_service';

import { contextServiceMock } from '../../context/context_service.mock';
import { loggingServiceMock } from '../../logging/logging_service.mock';
import { createHttpServer } from '../test_utils';
import { RouteValidationError } from '..';

let server: HttpService;

let logger: ReturnType<typeof loggingServiceMock.create>;
const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
};

beforeEach(() => {
  logger = loggingServiceMock.create();

  server = createHttpServer({ logger });
});

afterEach(async () => {
  await server.stop();
});

describe('Handler', () => {
  it("Doesn't expose error details if handler throws", async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => {
      throw new Error('unexpected error');
    });
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: unexpected error],
          ],
        ]
    `);
  });

  it('returns 500 Server error if handler throws Boom error', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => {
      throw Boom.unauthorized();
    });
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unauthorized],
        ],
      ]
    `);
  });

  it('returns 500 Server error if handler returns unexpected result', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);

    const router = createRouter('/');
    router.get({ path: '/', validate: false }, (context, req, res) => 'ok' as any);
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from Route Handler. Expected KibanaResponse, but given: string.],
        ],
      ]
    `);
  });

  it('returns 400 Bad request if request validation failed', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
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
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .query({ page: 'one' })
      .expect(400);

    expect(result.body).toEqual({
      error: 'Bad Request',
      message: '[request query.page]: expected value of type [number] but got [string]',
      statusCode: 400,
    });
  });
});

describe('handleLegacyErrors', () => {
  it('properly convert Boom errors', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { path: '/', validate: false },
      router.handleLegacyErrors((context, req, res) => {
        throw Boom.notFound();
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(404);

    expect(result.body.message).toBe('Not Found');
  });

  it('returns default error when non-Boom errors are thrown', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      {
        path: '/',
        validate: false,
      },
      router.handleLegacyErrors((context, req, res) => {
        throw new Error('Unexpected');
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body).toEqual({
      error: 'Internal Server Error',
      message: 'An internal server error occurred.',
      statusCode: 500,
    });
  });
});

describe('Response factory', () => {
  describe('Success', () => {
    it('supports answering with json object', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({ body: { key: 'value' } });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.body).toEqual({ key: 'value' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('supports answering with string', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({ body: 'result' });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toBe('result');
      expect(result.header['content-type']).toBe('text/html; charset=utf-8');
    });

    it('supports answering with undefined', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok(undefined);
      });

      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(200);
    });

    it('supports answering with Stream', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
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

        return res.ok({ body: stream });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toBe('abc');
      expect(result.header['content-type']).toBe(undefined);
    });

    it('supports answering with chunked Stream', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const stream = new Stream.PassThrough();
        stream.write('a');
        stream.write('b');
        setTimeout(function() {
          stream.write('c');
          stream.end();
        }, 100);

        return res.ok({ body: stream });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toBe('abc');
      expect(result.header['transfer-encoding']).toBe('chunked');
    });

    it('supports answering with Buffer', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const buffer = Buffer.alloc(1028, '.');

        return res.ok({
          body: buffer,
          headers: {
            'content-encoding': 'binary',
          },
        });
      });

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
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const buffer = Buffer.from('abc');

        return res.ok({
          body: buffer,
          headers: {
            'content-type': 'text/plain',
          },
        });
      });

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
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({
          body: 'value',
          headers: {
            etag: '1234',
          },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toEqual('value');
      expect(result.header.etag).toBe('1234');
    });

    it('supports configuring non-standard headers', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({
          body: 'value',
          headers: {
            etag: '1234',
            'x-kibana': 'key',
          },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.text).toEqual('value');
      expect(result.header.etag).toBe('1234');
      expect(result.header['x-kibana']).toBe('key');
    });

    it('accepted headers are case-insensitive.', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({
          body: 'value',
          headers: {
            ETag: '1234',
          },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.header.etag).toBe('1234');
    });

    it('accept array of headers', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({
          body: 'value',
          headers: {
            'set-cookie': ['foo', 'bar'],
          },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.header['set-cookie']).toEqual(['foo', 'bar']);
    });

    it('throws if given invalid json object as response payload', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const payload: any = { key: {} };
        payload.key.payload = payload;
        return res.ok({ body: payload });
      });

      await server.start();

      await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      // error happens within hapi when route handler already finished execution.
      expect(loggingServiceMock.collect(logger).error).toHaveLength(0);
    });

    it('200 OK with body', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.ok({ body: { key: 'value' } });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(200);

      expect(result.body).toEqual({ key: 'value' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('202 Accepted with body', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.accepted({ body: { location: 'somewhere' } });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(202);

      expect(result.body).toEqual({ location: 'somewhere' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('204 No content', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.noContent();
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(204);

      expect(result.noContent).toBe(true);
    });
  });

  describe('Redirection', () => {
    it('302 supports redirection to configured URL', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.redirected({
          body: 'The document has moved',
          headers: {
            location: '/new-url',
            'x-kibana': 'tag',
          },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(302);

      expect(result.text).toBe('The document has moved');
      expect(result.header.location).toBe('/new-url');
      expect(result.header['x-kibana']).toBe('tag');
    });

    it('throws if redirection url not provided', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.redirected({
          headers: {
            'x-kibana': 'tag',
          },
        } as any); // location headers is required
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.message).toBe('An internal server error occurred.');
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
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('some message');
        return res.badRequest({ body: error });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(result.body).toEqual({
        error: 'Bad Request',
        message: 'some message',
        statusCode: 400,
      });
    });

    it('400 Bad request with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.badRequest();
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(result.body).toEqual({
        error: 'Bad Request',
        message: 'Bad Request',
        statusCode: 400,
      });
    });

    it('400 Bad request with additional data', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.badRequest({
          body: { message: 'some message', attributes: { data: ['good', 'bad'] } },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(400);

      expect(result.body).toEqual({
        error: 'Bad Request',
        message: 'some message',
        attributes: {
          data: ['good', 'bad'],
        },
        statusCode: 400,
      });
    });

    it('validate function in body', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/foo');

      router.post(
        {
          path: '/',
          validate: {
            body: ({ bar, baz } = {}) => {
              if (typeof bar === 'string' && typeof baz === 'number') {
                return { value: { bar, baz } };
              } else {
                return { error: new RouteValidationError('Wrong payload', ['body']) };
              }
            },
          },
        },
        (context, req, res) => {
          return res.ok({ body: req.body });
        }
      );

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

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: '123',
        })
        .expect(400)
        .then(res => {
          expect(res.body).toEqual({
            error: 'Bad Request',
            message: '[request body.body]: Wrong payload',
            statusCode: 400,
          });
        });
    });

    it('@kbn/config-schema validation in body', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/foo');

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

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: '123', // Automatic casting happens
        })
        .expect(200)
        .then(res => {
          expect(res.body).toEqual({ bar: 'test', baz: 123 });
        });

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: 'test', // Can't cast it into number
        })
        .expect(400)
        .then(res => {
          expect(res.body).toEqual({
            error: 'Bad Request',
            message: '[request body.baz]: expected value of type [number] but got [string]',
            statusCode: 400,
          });
        });
    });

    it('401 Unauthorized', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('no access');
        return res.unauthorized({
          body: error,
          headers: {
            'WWW-Authenticate': 'challenge',
          },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.message).toBe('no access');
      expect(result.header['www-authenticate']).toBe('challenge');
    });

    it('401 Unauthorized with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.unauthorized();
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.message).toBe('Unauthorized');
    });

    it('403 Forbidden', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('reason');
        return res.forbidden({ body: error });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(403);

      expect(result.body.message).toBe('reason');
    });

    it('403 Forbidden with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.forbidden();
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(403);

      expect(result.body.message).toBe('Forbidden');
    });

    it('404 Not Found', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('file is not found');
        return res.notFound({ body: error });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(404);

      expect(result.body.message).toBe('file is not found');
    });

    it('404 Not Found with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.notFound();
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(404);

      expect(result.body.message).toBe('Not Found');
    });

    it('409 Conflict', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('stale version');
        return res.conflict({ body: error });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(409);

      expect(result.body.message).toBe('stale version');
    });

    it('409 Conflict with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.conflict();
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(409);

      expect(result.body.message).toBe('Conflict');
    });

    it('Custom error response', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);

      const router = createRouter('/');
      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('some message');
        return res.customError({
          body: error,
          statusCode: 418,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(418);

      expect(result.body).toEqual({
        error: "I'm a teapot",
        message: 'some message',
        statusCode: 418,
      });
    });

    it('Custom error response for server error', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('some message');

        return res.customError({
          body: error,
          statusCode: 500,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'some message',
        statusCode: 500,
      });
    });

    it('Custom error response for Boom server error', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('some message');

        return res.customError({
          body: Boom.boomify(error),
          statusCode: 500,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'some message',
        statusCode: 500,
      });
    });

    it('Custom error response requires error status code', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('some message');
        return res.customError({
          body: error,
          statusCode: 200,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'An internal server error occurred.',
        statusCode: 500,
      });
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: Unexpected Http status code. Expected from 400 to 599, but given: 200],
          ],
        ]
      `);
    });
  });

  describe('Custom', () => {
    it('creates success response', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          body: undefined,
          statusCode: 201,
          headers: {
            location: 'somewhere',
          },
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(201);

      expect(result.header.location).toBe('somewhere');
    });

    it('creates redirect response', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          body: 'The document has moved',
          headers: {
            location: '/new-url',
          },
          statusCode: 301,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(301);

      expect(result.header.location).toBe('/new-url');
    });

    it('throws if redirects without location header to be set', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          body: 'The document has moved',
          headers: {},
          statusCode: 301,
        });
      });

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
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('unauthorized');
        return res.custom({
          body: error,
          statusCode: 401,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.message).toBe('unauthorized');
    });

    it('creates error response with additional data', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          body: {
            message: 'unauthorized',
            attributes: { errorCode: 'K401' },
          },
          statusCode: 401,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        attributes: { errorCode: 'K401' },
        statusCode: 401,
      });
    });

    it('creates error response with additional data and error object', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          body: {
            message: new Error('unauthorized'),
            attributes: { errorCode: 'K401' },
          },
          statusCode: 401,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body).toEqual({
        error: 'Unauthorized',
        message: 'unauthorized',
        attributes: { errorCode: 'K401' },
        statusCode: 401,
      });
    });

    it('creates error response with Boom error', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = Boom.unauthorized();
        return res.custom({
          body: error,
          statusCode: 401,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(401);

      expect(result.body.message).toBe('Unauthorized');
    });

    it("Doesn't log details of created 500 Server error response", async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          body: 'reason',
          statusCode: 500,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.message).toBe('reason');
      expect(loggingServiceMock.collect(logger).error).toHaveLength(0);
    });

    it('throws an error if not valid error is provided', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          body: { error: 'error-message' },
          statusCode: 401,
        });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.message).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: expected error message to be provided],
          ],
        ]
      `);
    });

    it('throws if an error not provided', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        return res.custom({
          statusCode: 401,
        } as any); // requires error message
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.message).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: expected error message to be provided],
          ],
        ]
      `);
    });

    it('throws an error if statusCode is not specified', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('error message');
        return res.custom({ body: error } as any); // options.statusCode is required
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.message).toBe('An internal server error occurred.');
      expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: options.statusCode is expected to be set. given options: undefined],
          ],
        ]
      `);
    });

    it('throws an error if statusCode is not valid', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get({ path: '/', validate: false }, (context, req, res) => {
        const error = new Error('error message');
        return res.custom({ body: error, statusCode: 20 });
      });

      await server.start();

      const result = await supertest(innerServer.listener)
        .get('/')
        .expect(500);

      expect(result.body.message).toBe('An internal server error occurred.');
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
