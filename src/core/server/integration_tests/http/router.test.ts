/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { captureErrorMock } from './router.test.mocks';

import { Stream } from 'stream';
import Boom from '@hapi/boom';
import supertest from 'supertest';
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { Router } from '@kbn/core-http-router-server-internal';
import { loggerMock } from '@kbn/logging-mocks';
import { createTestEnv, getEnvOptions } from '@kbn/config-mocks';
import type { HttpService } from '@kbn/core-http-server-internal';
import { createInternalHttpService } from '../utilities';

const options = getEnvOptions();
options.cliArgs.dev = false;
const env = createTestEnv({ envOptions: options });

let server: HttpService;
let logger: ReturnType<typeof loggingSystemMock.create>;
const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
  executionContext: executionContextServiceMock.createInternalSetupContract(),
  userActivity: userActivityServiceMock.createInternalSetupContract(),
};

beforeEach(async () => {
  logger = loggingSystemMock.create();
  server = createInternalHttpService({ logger });
  await server.preboot({
    context: contextServiceMock.createPrebootContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
  });
});

afterEach(async () => {
  captureErrorMock.mockReset();
  await server.stop();
});

describe('Options', () => {
  describe('authRequired', () => {
    describe('optional', () => {
      it('User has access to a route if auth mechanism not registered', async () => {
        const { server: innerServer, createRouter, auth } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.get(
          {
            path: '/',
            validate: false,
            options: { authRequired: 'optional' },
            security: { authz: { enabled: false, reason: '' } },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: false,
          requestIsAuthenticated: false,
        });
      });

      it('Authenticated user has access to a route', async () => {
        const {
          server: innerServer,
          createRouter,
          registerAuth,
          auth,
        } = await server.setup(setupDeps);
        const router = createRouter('/');

        registerAuth((req, res, toolkit) => {
          return toolkit.authenticated();
        });
        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: 'optional' },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: true,
          requestIsAuthenticated: true,
        });
      });

      it('User with no credentials can access a route', async () => {
        const {
          server: innerServer,
          createRouter,
          registerAuth,
          auth,
        } = await server.setup(setupDeps);
        const router = createRouter('/');

        registerAuth((req, res, toolkit) => toolkit.notHandled());

        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: 'optional' },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: false,
          requestIsAuthenticated: false,
        });
      });

      it('User with invalid credentials can access a route', async () => {
        const {
          server: innerServer,
          createRouter,
          registerAuth,
          auth,
        } = await server.setup(setupDeps);
        const router = createRouter('/');

        registerAuth((req, res, toolkit) => res.unauthorized());

        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: 'optional' },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: false,
          requestIsAuthenticated: false,
        });
      });

      it('does not redirect user and allows access to a resource', async () => {
        const {
          server: innerServer,
          createRouter,
          registerAuth,
          auth,
        } = await server.setup(setupDeps);
        const router = createRouter('/');

        registerAuth((req, res, toolkit) =>
          toolkit.redirected({
            location: '/redirect-to',
          })
        );

        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: 'optional' },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: false,
          requestIsAuthenticated: false,
        });
      });
    });

    describe('true', () => {
      it('User has access to a route if auth  interceptor is not registered', async () => {
        const { server: innerServer, createRouter, auth } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: true },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: false,
          requestIsAuthenticated: false,
        });
      });

      it('Authenticated user has access to a route', async () => {
        const {
          server: innerServer,
          createRouter,
          registerAuth,
          auth,
        } = await server.setup(setupDeps);
        const router = createRouter('/');

        registerAuth((req, res, toolkit) => {
          return toolkit.authenticated();
        });
        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: true },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: true,
          requestIsAuthenticated: true,
        });
      });

      it('User with no credentials cannot access a route', async () => {
        const { server: innerServer, createRouter, registerAuth } = await server.setup(setupDeps);
        const router = createRouter('/');

        registerAuth((req, res, toolkit) => toolkit.notHandled());
        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: true },
          },
          (context, req, res) => res.ok({ body: 'ok' })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(401);
      });

      it('User with invalid credentials cannot access a route', async () => {
        const { server: innerServer, createRouter, registerAuth } = await server.setup(setupDeps);
        const router = createRouter('/');

        registerAuth((req, res, toolkit) => res.unauthorized());

        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: true },
          },
          (context, req, res) => res.ok({ body: 'ok' })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(401);
      });

      it('allows redirecting an user', async () => {
        const { server: innerServer, createRouter, registerAuth } = await server.setup(setupDeps);
        const router = createRouter('/');
        const redirectUrl = '/redirect-to';

        registerAuth((req, res, toolkit) =>
          toolkit.redirected({
            location: redirectUrl,
          })
        );

        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: true },
          },
          (context, req, res) => res.ok({ body: 'ok' })
        );
        await server.start();

        const result = await supertest(innerServer.listener).get('/').expect(302);

        expect(result.header.location).toBe(redirectUrl);
      });
    });

    describe('false', () => {
      it('does not try to authenticate a user', async () => {
        const {
          server: innerServer,
          createRouter,
          registerAuth,
          auth,
        } = await server.setup(setupDeps);
        const router = createRouter('/');

        const authHook = jest.fn();
        registerAuth(authHook);
        router.get(
          {
            path: '/',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { authRequired: false },
          },
          (context, req, res) =>
            res.ok({
              body: {
                httpAuthIsAuthenticated: auth.isAuthenticated(req),
                requestIsAuthenticated: req.auth.isAuthenticated,
              },
            })
        );
        await server.start();

        await supertest(innerServer.listener).get('/').expect(200, {
          httpAuthIsAuthenticated: false,
          requestIsAuthenticated: false,
        });

        expect(authHook).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('timeout', () => {
    const writeBodyCharAtATime = (request: supertest.Test, body: string, interval: number) => {
      return new Promise((resolve, reject) => {
        let i = 0;
        const intervalId = setInterval(() => {
          if (i < body.length) {
            void request.write(body[i++]);
          } else {
            clearInterval(intervalId);
            void request.end((err, res) => {
              resolve(res);
            });
          }
        }, interval);
        void request.on('error', (err) => {
          clearInterval(intervalId);
          reject(err);
        });
      });
    };

    describe('payload', () => {
      it('should timeout if POST payload sending is too slow', async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.post(
          {
            options: {
              body: {
                accepts: ['application/json'],
              },
              timeout: { payload: 100 },
            },
            path: '/a',
            validate: false,
            security: { authz: { enabled: false, reason: '' } },
          },
          async (context, req, res) => {
            return res.ok({});
          }
        );
        await server.start();

        // start the request
        const request = supertest(innerServer.listener)
          .post('/a')
          .set('Content-Type', 'application/json')
          .set('Transfer-Encoding', 'chunked');

        const result = writeBodyCharAtATime(request, '{"foo":"bar"}', 10);

        await expect(result).rejects.toMatchInlineSnapshot(`[Error: Request Timeout]`);
      });

      it('should not timeout if POST payload sending is quick', async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.post(
          {
            path: '/a',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: { body: { accepts: 'application/json' }, timeout: { payload: 10000 } },
          },
          async (context, req, res) => res.ok({})
        );
        await server.start();

        // start the request
        const request = supertest(innerServer.listener)
          .post('/a')
          .set('Content-Type', 'application/json')
          .set('Transfer-Encoding', 'chunked');

        const result = writeBodyCharAtATime(request, '{}', 10);

        await expect(result).resolves.toHaveProperty('status', 200);
      });
    });

    describe('idleSocket', () => {
      it('should timeout if payload sending has too long of an idle period', async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.post(
          {
            path: '/a',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: {
              body: {
                accepts: ['application/json'],
              },
              timeout: { idleSocket: 5 },
            },
          },
          async (context, req, res) => {
            return res.ok({});
          }
        );

        await server.start();

        // start the request
        const request = supertest(innerServer.listener)
          .post('/a')
          .set('Content-Type', 'application/json')
          .set('Transfer-Encoding', 'chunked');

        const result = writeBodyCharAtATime(request, '{}', 20);

        await expect(result).rejects.toThrow('socket hang up');
      });

      it(`should not timeout if payload sending doesn't have too long of an idle period`, async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.post(
          {
            path: '/a',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: {
              body: {
                accepts: ['application/json'],
              },
              timeout: { idleSocket: 1000 },
            },
          },
          async (context, req, res) => {
            return res.ok({});
          }
        );

        await server.start();

        // start the request
        const request = supertest(innerServer.listener)
          .post('/a')
          .set('Content-Type', 'application/json')
          .set('Transfer-Encoding', 'chunked');

        const result = writeBodyCharAtATime(request, '{}', 10);

        await expect(result).resolves.toHaveProperty('status', 200);
      });

      it('should timeout if servers response is too slow', async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.post(
          {
            path: '/a',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: {
              body: {
                accepts: ['application/json'],
              },
              timeout: { idleSocket: 1000, payload: 100 },
            },
          },
          async (context, req, res) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return res.ok({});
          }
        );

        await server.start();
        await expect(supertest(innerServer.listener).post('/a')).rejects.toThrow('socket hang up');
      });

      it('should not timeout if servers response is quick', async () => {
        const { server: innerServer, createRouter } = await server.setup(setupDeps);
        const router = createRouter('/');

        router.post(
          {
            path: '/a',
            security: { authz: { enabled: false, reason: '' } },
            validate: false,
            options: {
              body: {
                accepts: ['application/json'],
              },
              timeout: { idleSocket: 2000, payload: 100 },
            },
          },
          async (context, req, res) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return res.ok({});
          }
        );

        await server.start();
        await expect(supertest(innerServer.listener).post('/a')).resolves.toHaveProperty(
          'status',
          200
        );
      });
    });
  });
});

describe('Cache-Control', () => {
  it('does not allow responses to be cached by default', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      {
        path: '/',
        security: { authz: { enabled: false, reason: '' } },
        validate: false,
        options: {},
      },
      (context, req, res) => res.ok()
    );
    await server.start();

    await supertest(innerServer.listener)
      .get('/')
      .expect('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  });

  it('allows individual responses override the default cache-control header', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      {
        path: '/',
        security: { authz: { enabled: false, reason: '' } },
        validate: false,
        options: {},
      },
      (context, req, res) =>
        res.ok({
          headers: {
            'Cache-Control': 'public, max-age=1200',
          },
        })
    );
    await server.start();

    await supertest(innerServer.listener).get('/').expect('Cache-Control', 'public, max-age=1200');
  });
});

describe('Handler', () => {
  it("Doesn't expose error details if handler throws", async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { path: '/', security: { authz: { enabled: false, reason: '' } }, validate: false },
      (context, req, res) => {
        throw new Error('unexpected error');
      }
    );

    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );

    const [message] = loggingSystemMock.collect(logger).error[0];
    expect(message).toEqual('500 Server Error');
  });

  it('captures the error if handler throws', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    const error = new Error(`some error`);
    router.get(
      { path: '/', security: { authz: { enabled: false, reason: '' } }, validate: false },
      (context, req, res) => {
        throw error;
      }
    );
    await server.start();

    await supertest(innerServer.listener).get('/').expect(500);

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(error);
  });

  it('returns 500 Server error if handler throws Boom error', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { security: { authz: { enabled: false, reason: '' } }, path: '/{query}', validate: false },
      (context, req, res) => {
        throw Boom.unauthorized();
      }
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/some-data').expect(500);

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          "500 Server Error",
          Object {
            "error": Object {
              "message": "Unauthorized",
            },
            "http": Object {
              "request": Object {
                "method": "get",
                "path": "/{query}",
              },
              "response": Object {
                "status_code": 500,
              },
            },
          },
        ],
      ]
    `);
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });

  it('returns 500 Server error if handler returns unexpected result', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);

    const router = createRouter('/');
    router.get(
      { path: '/', security: { authz: { enabled: false, reason: '' } }, validate: false },
      (context, req, res) => 'ok' as any
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          "500 Server Error",
          Object {
            "error": Object {
              "message": "Unexpected result from Route Handler. Expected KibanaResponse, but given: string.",
            },
            "http": Object {
              "request": Object {
                "method": "get",
                "path": "/",
              },
              "response": Object {
                "status_code": 500,
              },
            },
          },
        ],
      ]
    `);
  });

  describe('returns 400 Bad request if request validation failed', () => {
    it('@kbn/config-schema', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        {
          path: '/',
          security: { authz: { enabled: false, reason: '' } },
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

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
              Array [
                Array [
                  "400 Bad Request",
                  Object {
                    "error": Object {
                      "message": "[request query.page]: expected value of type [number] but got [string]",
                    },
                    "http": Object {
                      "request": Object {
                        "method": "get",
                        "path": "/",
                      },
                      "response": Object {
                        "status_code": 400,
                      },
                    },
                  },
                ],
              ]
          `);
    });

    it('@kbn/zod', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        {
          path: '/',
          security: { authz: { enabled: false, reason: '' } },
          validate: {
            query: z.object({
              page: z.number(),
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
        message: expect.stringMatching(/Expected number, received string/),
        statusCode: 400,
      });

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "400 Bad Request",
            Object {
              "error": Object {
                "message": "[
          {
            \\"code\\": \\"invalid_type\\",
            \\"expected\\": \\"number\\",
            \\"received\\": \\"string\\",
            \\"path\\": [
              \\"page\\"
            ],
            \\"message\\": \\"Expected number, received string\\"
          }
        ]",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 400,
                },
              },
            },
          ],
        ]
      `);
    });
  });

  it('accept to receive an array payload', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    let body: any = null;
    router.post(
      {
        path: '/',
        security: { authz: { enabled: false, reason: '' } },
        validate: {
          body: schema.arrayOf(schema.object({ foo: schema.string() })),
        },
      },
      (context, req, res) => {
        body = req.body;
        return res.ok({ body: 'ok' });
      }
    );
    await server.start();

    await supertest(innerServer.listener)
      .post('/')
      .send([{ foo: 'bar' }, { foo: 'dolly' }])
      .expect(200);

    expect(body).toEqual([{ foo: 'bar' }, { foo: 'dolly' }]);
  });

  it('accept to receive a json primitive payload', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    let body: any = null;
    router.post(
      {
        path: '/',
        security: { authz: { enabled: false, reason: '' } },
        validate: {
          body: schema.number(),
        },
      },
      (context, req, res) => {
        body = req.body;
        return res.ok({ body: 'ok' });
      }
    );
    await server.start();

    await supertest(innerServer.listener).post('/').type('json').send('12').expect(200);

    expect(body).toEqual(12);
  });

  it('adds versioned header v2023-10-31 to public, unversioned routes', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.post(
      {
        path: '/public',
        security: { authz: { enabled: false, reason: '' } },
        validate: { body: schema.object({ ok: schema.boolean() }) },
        options: {
          access: 'public',
        },
      },
      (context, req, res) => {
        if (req.body.ok) {
          return res.ok({ body: 'ok', headers: { test: 'this' } });
        }
        return res.customError({ statusCode: 499, body: 'custom error' });
      }
    );
    router.post(
      {
        path: '/internal',
        security: { authz: { enabled: false, reason: '' } },
        validate: { body: schema.object({ ok: schema.boolean() }) },
      },
      (context, req, res) => {
        return res.ok({ body: 'ok', headers: { test: 'this' } });
      }
    );
    await server.start();

    // Includes header if validation fails
    {
      const { headers } = await supertest(innerServer.listener)
        .post('/public')
        .send({ ok: null })
        .expect(400);
      expect(headers).toMatchObject({ 'elastic-api-version': '2023-10-31' });
    }

    // Includes header if custom error
    {
      const { headers } = await supertest(innerServer.listener)
        .post('/public')
        .send({ ok: false })
        .expect(499);
      expect(headers).toMatchObject({ 'elastic-api-version': '2023-10-31' });
    }

    // Includes header if OK
    {
      const { headers } = await supertest(innerServer.listener)
        .post('/public')
        .send({ ok: true })
        .expect(200);
      expect(headers).toMatchObject({ 'elastic-api-version': '2023-10-31' });
    }

    // Internal unversioned routes do not include the header for OK
    {
      const { headers } = await supertest(innerServer.listener)
        .post('/internal')
        .send({ ok: true })
        .expect(200);
      expect(headers).not.toMatchObject({ 'elastic-api-version': '2023-10-31' });
    }

    // Internal unversioned routes do not include the header for validation failures
    {
      const { headers } = await supertest(innerServer.listener)
        .post('/internal')
        .send({ ok: null })
        .expect(400);
      expect(headers).not.toMatchObject({ 'elastic-api-version': '2023-10-31' });
    }
  });
});

describe('handleLegacyErrors', () => {
  it('properly convert Boom errors', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },

      router.handleLegacyErrors((context, req, res) => {
        throw Boom.notFound();
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(404);

    expect(result.body.message).toBe('Not Found');
  });

  it('returns default error when non-Boom errors are thrown', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      {
        path: '/',
        security: { authz: { enabled: false, reason: '' } },
        validate: false,
      },
      router.handleLegacyErrors((context, req, res) => {
        throw new Error('Unexpected');
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body).toEqual({
      error: 'Internal Server Error',
      message: 'An internal server error occurred. Check Kibana server logs for details.',
      statusCode: 500,
    });
  });
});

describe('Response factory', () => {
  describe('Success', () => {
    it('supports answering with json object', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok({ body: { key: 'value' } });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.body).toEqual({ key: 'value' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('supports answering with string', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok({ body: 'result' });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.text).toBe('result');
      expect(result.header['content-type']).toBe('text/html; charset=utf-8');
    });

    it('supports answering with undefined', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok(undefined);
        }
      );

      await server.start();

      await supertest(innerServer.listener).get('/').expect(200);
    });

    it('supports answering with Stream (without custom Content-Type)', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const stream = new Stream.Readable({
            read() {
              this.push('a');
              this.push('b');
              this.push('c');
              this.push(null);
            },
          });

          return res.ok({ body: stream });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.text).toBe(undefined);
      expect(result.body.toString()).toBe('abc');
      expect(result.header['content-type']).toBe('application/octet-stream');
    });

    it('supports answering with Stream (with custom Content-Type)', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const stream = new Stream.Readable({
            read() {
              this.push('a');
              this.push('b');
              this.push('c');
              this.push(null);
            },
          });

          return res.ok({
            body: stream,
            headers: {
              'Content-Type': 'text/plain',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.text).toBe('abc');
      expect(result.header['content-type']).toBe('text/plain; charset=utf-8');
    });

    it('supports answering with chunked Stream', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const stream = new Stream.PassThrough();
          stream.write('a');
          stream.write('b');
          setTimeout(function () {
            stream.write('c');
            stream.end();
          }, 100);

          return res.ok({
            body: stream,
            headers: {
              'Content-Type': 'text/plain',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.text).toBe('abc');
      expect(result.header['transfer-encoding']).toBe('chunked');
    });

    it('supports answering with Buffer', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const buffer = Buffer.alloc(1028, '.');

          return res.ok({
            body: buffer,
            headers: {
              'content-encoding': 'binary',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200).buffer(true);

      expect(result.header['content-encoding']).toBe('binary');
      expect(result.header['content-length']).toBe('1028');
      expect(result.header['content-type']).toBe('application/octet-stream');
    });

    it('supports answering with Buffer text', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const buffer = Buffer.from('abc');

          return res.ok({
            body: buffer,
            headers: {
              'content-type': 'text/plain',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200).buffer(true);

      expect(result.text).toBe('abc');
      expect(result.header['content-length']).toBe('3');
      expect(result.header['content-type']).toBe('text/plain; charset=utf-8');
    });

    it('supports configuring standard headers', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok({
            body: 'value',
            headers: {
              age: '42',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.text).toEqual('value');
      expect(result.header.age).toBe('42');
    });

    it('supports configuring non-standard headers', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok({
            body: 'value',
            headers: {
              age: '42',
              'x-kibana': 'key',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.text).toEqual('value');
      expect(result.header.age).toBe('42');
      expect(result.header['x-kibana']).toBe('key');
    });

    it('accepted headers are case-insensitive.', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok({
            body: 'value',
            headers: {
              AgE: '42',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.header.age).toBe('42');
    });

    it('accept array of headers', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok({
            body: 'value',
            headers: {
              'set-cookie': ['foo', 'bar'],
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.header['set-cookie']).toEqual(['foo', 'bar']);
    });

    it('throws if given invalid json object as response payload', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const payload: any = { key: {} };
          payload.key.payload = payload;
          return res.ok({ body: payload });
        }
      );

      await server.start();

      await supertest(innerServer.listener).get('/').expect(500);

      // error happens within hapi when route handler already finished execution.
      expect(loggingSystemMock.collect(logger).error).toHaveLength(0);
    });

    it('200 OK with body', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.ok({ body: { key: 'value' } });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(200);

      expect(result.body).toEqual({ key: 'value' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('202 Accepted with body', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.accepted({ body: { location: 'somewhere' } });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(202);

      expect(result.body).toEqual({ location: 'somewhere' });
      expect(result.header['content-type']).toBe('application/json; charset=utf-8');
    });

    it('204 No content', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.noContent();
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(204);

      expect(result.noContent).toBe(true);
    });
  });

  describe('Redirection', () => {
    it('302 supports redirection to configured URL', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.redirected({
            body: 'The document has moved',
            headers: {
              location: '/new-url',
              'x-kibana': 'tag',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(302);

      expect(result.text).toBe('The document has moved');
      expect(result.header.location).toBe('/new-url');
      expect(result.header['x-kibana']).toBe('tag');
    });

    it('throws if redirection url not provided', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.redirected({
            headers: {
              'x-kibana': 'tag',
            },
          } as any); // location headers is required
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body.message).toBe(
        'An internal server error occurred. Check Kibana server logs for details.'
      );
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "500 Server Error",
            Object {
              "error": Object {
                "message": "expected 'location' header to be set",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 500,
                },
              },
            },
          ],
        ]
      `);
    });
  });

  describe('Error', () => {
    it('400 Bad request', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('some message');
          return res.badRequest({ body: error });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(400);

      expect(result.body).toEqual({
        error: 'Bad Request',
        message: 'some message',
        statusCode: 400,
      });
    });

    it('400 Bad request with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.badRequest();
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(400);

      expect(result.body).toEqual({
        error: 'Bad Request',
        message: 'Bad Request',
        statusCode: 400,
      });
    });

    it('400 Bad request with additional data', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.badRequest({
            body: { message: 'some message', attributes: { data: ['good', 'bad'] } },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(400);

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
          security: { authz: { enabled: false, reason: '' } },
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

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: '123',
        })
        .expect(400)
        .then((res) => {
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
          security: { authz: { enabled: false, reason: '' } },
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
        .then((res) => {
          expect(res.body).toEqual({ bar: 'test', baz: 123 });
        });

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: '123', // Automatic casting happens
        })
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual({ bar: 'test', baz: 123 });
        });

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: 'test', // Can't cast it into number
        })
        .expect(400)
        .then((res) => {
          expect(res.body).toEqual({
            error: 'Bad Request',
            message: '[request body.baz]: expected value of type [number] but got [string]',
            statusCode: 400,
          });
        });
    });

    it('@kbn/config-schema validation in request.body', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/foo');

      const runtimeValidation = schema.object({
        bar: schema.string(),
        baz: schema.number(),
      });

      router.post(
        {
          path: '/',
          security: { authz: { enabled: false, reason: '' } },
          validate: {
            request: {
              body: runtimeValidation,
            },
            response: {
              200: {
                body: () => runtimeValidation,
              },
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
        .then((res) => {
          expect(res.body).toEqual({ bar: 'test', baz: 123 });
        });

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: '123', // Automatic casting happens
        })
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual({ bar: 'test', baz: 123 });
        });

      await supertest(innerServer.listener)
        .post('/foo/')
        .send({
          bar: 'test',
          baz: 'test', // Can't cast it into number
        })
        .expect(400)
        .then((res) => {
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

      router.get(
        { path: '/', security: { authz: { enabled: false, reason: '' } }, validate: false },
        (context, req, res) => {
          const error = new Error('no access');
          return res.unauthorized({
            body: error,
            headers: {
              'WWW-Authenticate': 'challenge',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(401);

      expect(result.body.message).toBe('no access');
      expect(result.header['www-authenticate']).toBe('challenge');
    });

    it('401 Unauthorized with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.unauthorized();
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(401);

      expect(result.body.message).toBe('Unauthorized');
    });

    it('403 Forbidden', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('reason');
          return res.forbidden({ body: error });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(403);

      expect(result.body.message).toBe('reason');
    });

    it('403 Forbidden with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.forbidden();
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(403);

      expect(result.body.message).toBe('Forbidden');
    });

    it('404 Not Found', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('file is not found');
          return res.notFound({ body: error });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(404);

      expect(result.body.message).toBe('file is not found');
    });

    it('404 Not Found with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.notFound();
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(404);

      expect(result.body.message).toBe('Not Found');
    });

    it('409 Conflict', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('stale version');
          return res.conflict({ body: error });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(409);

      expect(result.body.message).toBe('stale version');
    });

    it('409 Conflict with default message', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.conflict();
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(409);

      expect(result.body.message).toBe('Conflict');
    });

    it('Custom error response', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);

      const router = createRouter('/');
      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('some message');
          return res.customError({
            body: error,
            statusCode: 418,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(418);

      expect(result.body).toEqual({
        error: "I'm a teapot",
        message: 'some message',
        statusCode: 418,
      });
    });

    it('Custom error response for server error', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('some message');

          return res.customError({
            body: error,
            statusCode: 500,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'some message',
        statusCode: 500,
      });
    });

    it('Custom error response for Boom server error', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('some message');

          return res.customError({
            body: Boom.boomify(error),
            statusCode: 500,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'some message',
        statusCode: 500,
      });
    });

    it('Custom error response requires error status code', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('some message');
          return res.customError({
            body: error,
            statusCode: 200,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'An internal server error occurred. Check Kibana server logs for details.',
        statusCode: 500,
      });
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "500 Server Error",
            Object {
              "error": Object {
                "message": "Unexpected Http status code. Expected from 400 to 599, but given: 200",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 500,
                },
              },
            },
          ],
        ]
      `);
    });
  });

  describe('Custom', () => {
    it('creates success response', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            body: undefined,
            statusCode: 201,
            headers: {
              location: 'somewhere',
            },
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(201);

      expect(result.header.location).toBe('somewhere');
    });

    it('creates redirect response', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            body: 'The document has moved',
            headers: {
              location: '/new-url',
            },
            statusCode: 301,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(301);

      expect(result.header.location).toBe('/new-url');
    });

    it('throws if redirects without location header to be set', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            body: 'The document has moved',
            headers: {},
            statusCode: 301,
          });
        }
      );

      await server.start();

      await supertest(innerServer.listener).get('/').expect(500);

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "500 Server Error",
            Object {
              "error": Object {
                "message": "expected 'location' header to be set",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 500,
                },
              },
            },
          ],
        ]
      `);
    });

    it('creates error response', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('unauthorized');
          return res.custom({
            body: error,
            statusCode: 401,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(401);

      expect(result.body.message).toBe('unauthorized');
    });

    it('creates error response with additional data', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            body: {
              message: 'unauthorized',
              attributes: { errorCode: 'K401' },
            },
            statusCode: 401,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(401);

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

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            body: {
              message: new Error('unauthorized'),
              attributes: { errorCode: 'K401' },
            },
            statusCode: 401,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(401);

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

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = Boom.unauthorized();
          return res.custom({
            body: error,
            statusCode: 401,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(401);

      expect(result.body.message).toBe('Unauthorized');
    });

    it("Doesn't log details of created 500 Server error response", async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            body: 'reason',
            statusCode: 500,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body).toEqual({
        error: 'Internal Server Error',
        message: 'reason',
        statusCode: 500,
      });
      expect(loggingSystemMock.collect(logger).error).toHaveLength(0);
    });

    it('throws an error if not valid error is provided', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            body: { error: 'error-message' },
            statusCode: 401,
          });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body.message).toBe(
        'An internal server error occurred. Check Kibana server logs for details.'
      );
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "500 Server Error",
            Object {
              "error": Object {
                "message": "expected error message to be provided",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 500,
                },
              },
            },
          ],
        ]
      `);
    });

    it('throws if an error not provided', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          return res.custom({
            statusCode: 401,
          } as any); // requires error message
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body.message).toBe(
        'An internal server error occurred. Check Kibana server logs for details.'
      );
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "500 Server Error",
            Object {
              "error": Object {
                "message": "expected error message to be provided",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 500,
                },
              },
            },
          ],
        ]
      `);
    });

    it('throws an error if statusCode is not specified', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('error message');
          return res.custom({ body: error } as any); // options.statusCode is required
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body.message).toBe(
        'An internal server error occurred. Check Kibana server logs for details.'
      );
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "500 Server Error",
            Object {
              "error": Object {
                "message": "options.statusCode is expected to be set. given options: undefined",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 500,
                },
              },
            },
          ],
        ]
      `);
    });

    it('throws an error if statusCode is not valid', async () => {
      const { server: innerServer, createRouter } = await server.setup(setupDeps);
      const router = createRouter('/');

      router.get(
        { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
        (context, req, res) => {
          const error = new Error('error message');
          return res.custom({ body: error, statusCode: 20 });
        }
      );

      await server.start();

      const result = await supertest(innerServer.listener).get('/').expect(500);

      expect(result.body.message).toBe(
        'An internal server error occurred. Check Kibana server logs for details.'
      );
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "500 Server Error",
            Object {
              "error": Object {
                "message": "Unexpected Http status code. Expected from 100 to 599, but given: 20.",
              },
              "http": Object {
                "request": Object {
                  "method": "get",
                  "path": "/",
                },
                "response": Object {
                  "status_code": 500,
                },
              },
            },
          ],
        ]
      `);
    });
  });
});

describe('ETag', () => {
  it('returns the `etag` header', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);

    const router = createRouter('');
    router.get(
      {
        path: '/route',
        security: { authz: { enabled: false, reason: '' } },
        validate: false,
      },
      (context, req, res) =>
        res.ok({
          body: { foo: 'bar' },
          headers: {
            etag: 'etag-1',
          },
        })
    );

    await server.start();
    const response = await supertest(innerServer.listener)
      .get('/route')
      .expect(200, { foo: 'bar' });
    expect(response.get('etag')).toEqual('"etag-1"');
  });

  it('returns a 304 when the etag value matches', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);

    const router = createRouter('');
    router.get(
      {
        path: '/route',
        validate: false,
        security: { authz: { enabled: false, reason: '' } },
      },
      (context, req, res) =>
        res.ok({
          body: { foo: 'bar' },
          headers: {
            etag: 'etag-1',
          },
        })
    );

    await server.start();
    await supertest(innerServer.listener)
      .get('/route')
      .set('If-None-Match', '"etag-1"')
      .expect(304, '');
  });
});

describe('registerRouterAfterListening', () => {
  it('allows a router to be registered before server has started listening', async () => {
    const {
      server: innerServer,
      createRouter,
      registerRouterAfterListening,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
      (context, req, res) => {
        return res.ok({ body: 'hello' });
      }
    );

    const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

    const otherRouter = new Router('/test', loggerMock.create(), enhanceWithContext, {
      env,
      versionedRouterOptions: {
        defaultHandlerResolutionStrategy: 'oldest',
      },
    });
    otherRouter.get(
      {
        path: '/afterListening',
        validate: false,
        security: { authz: { enabled: false, reason: '' } },
      },
      (context, req, res) => {
        return res.ok({ body: 'hello from other router' });
      }
    );

    registerRouterAfterListening(otherRouter);

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200);
    await supertest(innerServer.listener).get('/test/afterListening').expect(200);
  });

  it('allows a router to be registered after server has started listening', async () => {
    const {
      server: innerServer,
      createRouter,
      registerRouterAfterListening,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { path: '/', validate: false, security: { authz: { enabled: false, reason: '' } } },
      (context, req, res) => {
        return res.ok({ body: 'hello' });
      }
    );

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200);
    await supertest(innerServer.listener).get('/test/afterListening').expect(404);

    const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

    const otherRouter = new Router('/test', loggerMock.create(), enhanceWithContext, {
      env,
      versionedRouterOptions: {
        defaultHandlerResolutionStrategy: 'oldest',
      },
    });
    otherRouter.get(
      {
        path: '/afterListening',
        validate: false,
        security: { authz: { enabled: false, reason: '' } },
      },
      (context, req, res) => {
        return res.ok({ body: 'hello from other router' });
      }
    );

    registerRouterAfterListening(otherRouter);

    await supertest(innerServer.listener).get('/test/afterListening').expect(200);
  });
});
