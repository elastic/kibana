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

import supertest from 'supertest';
import request from 'request';
import { schema } from '@kbn/config-schema';

import { ensureRawRequest } from '../router';
import { HttpService } from '../http_service';

import { contextServiceMock } from '../../context/context_service.mock';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { createHttpServer } from '../test_utils';

let server: HttpService;

let logger: ReturnType<typeof loggingSystemMock.create>;

const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
};

beforeEach(() => {
  logger = loggingSystemMock.create();
  server = createHttpServer({ logger });
});

afterEach(async () => {
  await server.stop();
});

interface User {
  id: string;
  roles?: string[];
}

interface StorageData {
  value: User;
  expires: number;
}

describe('OnPreAuth', () => {
  it('supports registering a request interceptor', async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    const callingOrder: string[] = [];
    registerOnPreAuth((req, res, t) => {
      callingOrder.push('first');
      return t.next();
    });

    registerOnPreAuth((req, res, t) => {
      callingOrder.push('second');
      return t.next();
    });
    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, 'ok');

    expect(callingOrder).toEqual(['first', 'second']);
  });

  it('supports request forwarding to specified url', async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/initial', validate: false }, (context, req, res) =>
      res.ok({ body: 'initial' })
    );
    router.get({ path: '/redirectUrl', validate: false }, (context, req, res) =>
      res.ok({ body: 'redirected' })
    );

    let urlBeforeForwarding;
    registerOnPreAuth((req, res, t) => {
      urlBeforeForwarding = ensureRawRequest(req).raw.req.url;
      return t.rewriteUrl('/redirectUrl');
    });

    let urlAfterForwarding;
    registerOnPreAuth((req, res, t) => {
      // used by legacy platform
      urlAfterForwarding = ensureRawRequest(req).raw.req.url;
      return t.next();
    });

    await server.start();

    await supertest(innerServer.listener).get('/initial').expect(200, 'redirected');

    expect(urlBeforeForwarding).toBe('/initial');
    expect(urlAfterForwarding).toBe('/redirectUrl');
  });

  it('supports redirection from the interceptor', async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    const redirectUrl = '/redirectUrl';
    router.get({ path: '/initial', validate: false }, (context, req, res) => res.ok());

    registerOnPreAuth((req, res, t) =>
      res.redirected({
        headers: {
          location: redirectUrl,
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/initial').expect(302);

    expect(result.header.location).toBe(redirectUrl);
  });

  it('supports rejecting request and adjusting response headers', async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());

    registerOnPreAuth((req, res, t) =>
      res.unauthorized({
        headers: {
          'www-authenticate': 'challenge',
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(401);

    expect(result.header['www-authenticate']).toBe('challenge');
  });

  it('does not expose error details if interceptor throws', async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());

    registerOnPreAuth((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());

    registerOnPreAuth((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from OnPreAuth. Expected OnPreAuthResult or KibanaResponse, but given: [object Object].],
        ],
      ]
    `);
  });

  it(`doesn't share request object between interceptors`, async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    registerOnPreAuth((req, res, t) => {
      // don't complain customField is not defined on Request type
      (req as any).customField = { value: 42 };
      return t.next();
    });
    registerOnPreAuth((req, res, t) => {
      // don't complain customField is not defined on Request type
      if (typeof (req as any).customField !== 'undefined') {
        throw new Error('Request object was mutated');
      }
      return t.next();
    });
    router.get({ path: '/', validate: false }, (context, req, res) =>
      // don't complain customField is not defined on Request type
      res.ok({ body: { customField: String((req as any).customField) } })
    );

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, { customField: 'undefined' });
  });

  it('has no access to request body', async () => {
    const { registerOnPreAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    let requestBody = null;
    registerOnPreAuth((req, res, t) => {
      requestBody = req.body;
      return t.next();
    });

    router.post(
      {
        path: '/',
        validate: {
          body: schema.object({
            term: schema.string(),
          }),
        },
      },
      (context, req, res) => res.ok({ body: req.body.term })
    );

    await server.start();

    await supertest(innerServer.listener)
      .post('/')
      .send({
        term: 'foo',
      })
      .expect(200, 'foo');

    expect(requestBody).toStrictEqual({});
  });
});

describe('OnPostAuth', () => {
  it('supports registering request inceptors', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    const callingOrder: string[] = [];
    registerOnPostAuth((req, res, t) => {
      callingOrder.push('first');
      return t.next();
    });

    registerOnPostAuth((req, res, t) => {
      callingOrder.push('second');
      return t.next();
    });
    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, 'ok');

    expect(callingOrder).toEqual(['first', 'second']);
  });

  it('supports redirection from the interceptor', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    const redirectUrl = '/redirectUrl';
    router.get({ path: '/initial', validate: false }, (context, req, res) => res.ok());

    registerOnPostAuth((req, res, t) =>
      res.redirected({
        headers: {
          location: redirectUrl,
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/initial').expect(302);

    expect(result.header.location).toBe(redirectUrl);
  });

  it('supports rejecting request and adjusting response headers', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok(undefined));
    registerOnPostAuth((req, res, t) =>
      res.unauthorized({
        headers: {
          'www-authenticate': 'challenge',
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(401);

    expect(result.header['www-authenticate']).toBe('challenge');
  });

  it("doesn't expose error details if interceptor throws", async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok(undefined));
    registerOnPostAuth((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    registerOnPostAuth((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from OnPostAuth. Expected OnPostAuthResult or KibanaResponse, but given: [object Object].],
        ],
      ]
    `);
  });

  it(`doesn't share request object between interceptors`, async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    registerOnPostAuth((req, res, t) => {
      // don't complain customField is not defined on Request type
      (req as any).customField = { value: 42 };
      return t.next();
    });
    registerOnPostAuth((req, res, t) => {
      // don't complain customField is not defined on Request type
      if (typeof (req as any).customField !== 'undefined') {
        throw new Error('Request object was mutated');
      }
      return t.next();
    });

    router.get({ path: '/', validate: false }, (context, req, res) =>
      // don't complain customField is not defined on Request type
      res.ok({ body: { customField: String((req as any).customField) } })
    );

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, { customField: 'undefined' });
  });

  it('has no access to request body', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    let requestBody = null;
    registerOnPostAuth((req, res, t) => {
      requestBody = req.body;
      return t.next();
    });

    router.post(
      {
        path: '/',
        validate: {
          body: schema.object({
            term: schema.string(),
          }),
        },
      },
      (context, req, res) => res.ok({ body: req.body.term })
    );

    await server.start();

    await supertest(innerServer.listener)
      .post('/')
      .send({
        term: 'foo',
      })
      .expect(200, 'foo');

    expect(requestBody).toStrictEqual({});
  });
});

describe('Auth', () => {
  const cookieOptions = {
    name: 'sid',
    encryptionKey: 'something_at_least_32_characters',
    validate: () => ({ isValid: true }),
    isSecure: false,
  };

  it('registers auth request interceptor only once', async () => {
    const { registerAuth } = await server.setup(setupDeps);
    const doRegister = () => registerAuth(() => null as any);
    doRegister();

    expect(doRegister).toThrowError('Auth interceptor was already registered');
  });

  it('may grant access to a resource', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.ok({ body: { content: 'ok' } })
    );
    registerAuth((req, res, t) => t.authenticated());
    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, { content: 'ok' });
  });

  it('blocks access to a resource if credentials are not provided', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.ok({ body: { content: 'ok' } })
    );
    registerAuth((req, res, t) => t.notHandled());
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(401);

    expect(result.body.message).toBe('Unauthorized');
  });

  it('enables auth for a route by default if registerAuth has been called', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.ok({ body: { authRequired: req.route.options.authRequired } })
    );
    const authenticate = jest.fn().mockImplementation((req, res, t) => t.authenticated());
    registerAuth(authenticate);

    await server.start();
    await supertest(innerServer.listener).get('/').expect(200, { authRequired: true });

    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  test('supports disabling auth for a route explicitly', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { path: '/', validate: false, options: { authRequired: false } },
      (context, req, res) => res.ok({ body: { authRequired: req.route.options.authRequired } })
    );

    const authenticate = jest.fn();
    registerAuth(authenticate);

    await server.start();
    await supertest(innerServer.listener).get('/').expect(200, { authRequired: false });

    expect(authenticate).toHaveBeenCalledTimes(0);
  });

  test('supports enabling auth for a route explicitly', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      { path: '/', validate: false, options: { authRequired: true } },
      (context, req, res) => res.ok({ body: { authRequired: req.route.options.authRequired } })
    );

    const authenticate = jest.fn().mockImplementation((req, res, t) => t.authenticated({}));
    await registerAuth(authenticate);

    await server.start();
    await supertest(innerServer.listener).get('/').expect(200, { authRequired: true });

    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it('supports rejecting a request from an unauthenticated user', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    registerAuth((req, res) => res.unauthorized());
    await server.start();

    await supertest(innerServer.listener).get('/').expect(401);
  });

  it('supports redirecting', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    const redirectTo = '/redirect-url';
    registerAuth((req, res, t) =>
      t.redirected({
        location: redirectTo,
      })
    );
    await server.start();

    const response = await supertest(innerServer.listener).get('/').expect(302);
    expect(response.header.location).toBe(redirectTo);
  });

  it('throws if redirection url is not provided', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    registerAuth((req, res, t) => t.redirected({} as any));
    await server.start();

    await supertest(innerServer.listener).get('/').expect(500);
  });

  it(`doesn't expose internal error details`, async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    registerAuth((req, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('allows manipulating cookies via cookie session storage', async () => {
    const {
      createCookieSessionStorageFactory,
      registerAuth,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());

    const sessionStorageFactory = await createCookieSessionStorageFactory<StorageData>(
      cookieOptions
    );
    registerAuth((req, res, toolkit) => {
      const user = { id: '42' };
      const sessionStorage = sessionStorageFactory.asScoped(req);
      sessionStorage.set({ value: user, expires: Date.now() + 1000 });
      return toolkit.authenticated({ state: user });
    });

    await server.start();

    const response = await supertest(innerServer.listener).get('/').expect(200);

    expect(response.header['set-cookie']).toBeDefined();
    const cookies = response.header['set-cookie'];
    expect(cookies).toHaveLength(1);

    const sessionCookie = request.cookie(cookies[0]);
    if (!sessionCookie) {
      throw new Error('session cookie expected to be defined');
    }
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.key).toBe('sid');
    expect(sessionCookie.value).toBeDefined();
    expect(sessionCookie.path).toBe('/');
    expect(sessionCookie.httpOnly).toBe(true);
  });

  it('allows manipulating cookies from route handler', async () => {
    const {
      createCookieSessionStorageFactory,
      registerAuth,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    const sessionStorageFactory = await createCookieSessionStorageFactory<StorageData>(
      cookieOptions
    );
    registerAuth((req, res, toolkit) => {
      const user = { id: '42' };
      const sessionStorage = sessionStorageFactory.asScoped(req);
      sessionStorage.set({ value: user, expires: Date.now() + 1000 });
      return toolkit.authenticated();
    });

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    router.get({ path: '/with-cookie', validate: false }, (context, req, res) => {
      const sessionStorage = sessionStorageFactory.asScoped(req);
      sessionStorage.clear();
      return res.ok();
    });
    await server.start();

    const responseToSetCookie = await supertest(innerServer.listener).get('/').expect(200);

    expect(responseToSetCookie.header['set-cookie']).toBeDefined();

    const responseToResetCookie = await supertest(innerServer.listener)
      .get('/with-cookie')
      .expect(200);

    expect(responseToResetCookie.header['set-cookie']).toEqual([
      'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/',
    ]);
  });

  it.skip('is the only place with access to the authorization header', async () => {
    const {
      registerOnPreAuth,
      registerAuth,
      registerOnPostAuth,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    let fromRegisterOnPreAuth;
    await registerOnPreAuth((req, res, toolkit) => {
      fromRegisterOnPreAuth = req.headers.authorization;
      return toolkit.next();
    });

    let fromRegisterAuth;
    registerAuth((req, res, toolkit) => {
      fromRegisterAuth = req.headers.authorization;
      return toolkit.authenticated();
    });

    let fromRegisterOnPostAuth;
    await registerOnPostAuth((req, res, toolkit) => {
      fromRegisterOnPostAuth = req.headers.authorization;
      return toolkit.next();
    });

    let fromRouteHandler;

    router.get({ path: '/', validate: false }, (context, req, res) => {
      fromRouteHandler = req.headers.authorization;
      return res.ok();
    });
    await server.start();

    const token = 'Basic: user:password';
    await supertest(innerServer.listener).get('/').set('Authorization', token).expect(200);

    expect(fromRegisterOnPreAuth).toEqual({});
    expect(fromRegisterAuth).toEqual({ authorization: token });
    expect(fromRegisterOnPostAuth).toEqual({});
    expect(fromRouteHandler).toEqual({});
  });

  it('attach security header to a successful response', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    const authResponseHeader = {
      'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
    };
    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    await server.start();

    const response = await supertest(innerServer.listener).get('/').expect(200);

    expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
  });

  it('attach security header to an error response', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    const authResponseHeader = {
      'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
    };

    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    router.get({ path: '/', validate: false }, (context, req, res) => res.badRequest());
    await server.start();

    const response = await supertest(innerServer.listener).get('/').expect(400);

    expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
  });

  it('logs warning if Auth Security Header rewrites response header for success response', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    const authResponseHeader = {
      'www-authenticate': 'from auth interceptor',
    };

    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.ok({
        headers: {
          'www-authenticate': 'from handler',
          'another-header': 'yet another header',
        },
      })
    );
    await server.start();

    const response = await supertest(innerServer.listener).get('/').expect(200);

    expect(response.header['www-authenticate']).toBe('from auth interceptor');
    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "onPreResponseHandler rewrote a response header [www-authenticate].",
        ],
      ]
    `);
  });

  it('logs warning if Auth Security Header rewrites response header for error response', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    const authResponseHeader = {
      'www-authenticate': 'from auth interceptor',
    };

    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.badRequest({
        headers: {
          'www-authenticate': 'from handler',
        },
      })
    );
    await server.start();

    const response = await supertest(innerServer.listener).get('/').expect(400);

    expect(response.header['www-authenticate']).toBe('from auth interceptor');
    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "onPreResponseHandler rewrote a response header [www-authenticate].",
        ],
      ]
    `);
  });

  it('supports redirection from the interceptor', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    const redirectUrl = '/redirectUrl';
    router.get({ path: '/initial', validate: false }, (context, req, res) => res.ok());
    registerOnPostAuth((req, res, t) =>
      res.redirected({
        headers: {
          location: redirectUrl,
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/initial').expect(302);

    expect(result.header.location).toBe(redirectUrl);
  });

  it('supports rejecting request and adjusting response headers', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok(undefined));

    registerOnPostAuth((req, res, t) =>
      res.unauthorized({
        headers: {
          'www-authenticate': 'challenge',
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(401);

    expect(result.header['www-authenticate']).toBe('challenge');
  });

  it("doesn't expose error details if interceptor throws", async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok(undefined));
    registerOnPostAuth((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    registerOnPostAuth((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from OnPostAuth. Expected OnPostAuthResult or KibanaResponse, but given: [object Object].],
        ],
      ]
    `);
  });

  it(`doesn't share request object between interceptors`, async () => {
    const { registerOnPostAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    registerOnPostAuth((req, res, t) => {
      // don't complain customField is not defined on Request type
      (req as any).customField = { value: 42 };
      return t.next();
    });
    registerOnPostAuth((req, res, t) => {
      // don't complain customField is not defined on Request type
      if (typeof (req as any).customField !== 'undefined') {
        throw new Error('Request object was mutated');
      }
      return t.next();
    });
    router.get({ path: '/', validate: false }, (context, req, res) =>
      // don't complain customField is not defined on Request type
      res.ok({ body: { customField: String((req as any).customField) } })
    );

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, { customField: 'undefined' });
  });

  it('has no access to request body', async () => {
    const { registerAuth, server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    let requestBody = null;
    registerAuth((req, res, t) => {
      requestBody = req.body;
      return t.authenticated({});
    });

    router.post(
      {
        path: '/',
        validate: {
          body: schema.object({
            term: schema.string(),
          }),
        },
      },
      (context, req, res) => res.ok({ body: req.body.term })
    );

    await server.start();

    await supertest(innerServer.listener)
      .post('/')
      .send({
        term: 'foo',
      })
      .expect(200, 'foo');

    expect(requestBody).toStrictEqual({});
  });
});

describe('OnPreResponse', () => {
  it('supports registering response interceptors', async () => {
    const { registerOnPreResponse, server: innerServer, createRouter } = await server.setup(
      setupDeps
    );
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    const callingOrder: string[] = [];
    registerOnPreResponse((req, res, t) => {
      callingOrder.push('first');
      return t.next();
    });

    registerOnPreResponse((req, res, t) => {
      callingOrder.push('second');
      return t.next();
    });
    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, 'ok');

    expect(callingOrder).toEqual(['first', 'second']);
  });

  it('supports additional headers attachments', async () => {
    const { registerOnPreResponse, server: innerServer, createRouter } = await server.setup(
      setupDeps
    );
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.ok({
        headers: {
          'x-my-header': 'foo',
        },
      })
    );

    registerOnPreResponse((req, res, t) =>
      t.next({
        headers: {
          'x-kibana-header': 'value',
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(200);

    expect(result.header['x-kibana-header']).toBe('value');
    expect(result.header['x-my-header']).toBe('foo');
  });

  it('logs a warning if interceptor rewrites response header', async () => {
    const { registerOnPreResponse, server: innerServer, createRouter } = await server.setup(
      setupDeps
    );
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.ok({
        headers: { 'x-kibana-header': 'value' },
      })
    );
    registerOnPreResponse((req, res, t) =>
      t.next({
        headers: { 'x-kibana-header': 'value' },
      })
    );
    await server.start();

    await supertest(innerServer.listener).get('/').expect(200);

    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "onPreResponseHandler rewrote a response header [x-kibana-header].",
        ],
      ]
    `);
  });

  it("doesn't expose error details if interceptor throws", async () => {
    const { registerOnPreResponse, server: innerServer, createRouter } = await server.setup(
      setupDeps
    );
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok(undefined));
    registerOnPreResponse((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const { registerOnPreResponse, server: innerServer, createRouter } = await server.setup(
      setupDeps
    );
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    registerOnPreResponse((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe('An internal server error occurred.');
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from OnPreResponse. Expected OnPreResponseResult, but given: [object Object].],
        ],
      ]
    `);
  });

  it('cannot change response statusCode', async () => {
    const { registerOnPreResponse, server: innerServer, createRouter } = await server.setup(
      setupDeps
    );
    const router = createRouter('/');

    registerOnPreResponse((req, res, t) => {
      res.statusCode = 500;
      return t.next();
    });

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200);
  });

  it('has no access to request body', async () => {
    const { registerOnPreResponse, server: innerServer, createRouter } = await server.setup(
      setupDeps
    );
    const router = createRouter('/');
    let requestBody = null;
    registerOnPreResponse((req, res, t) => {
      requestBody = req.body;
      return t.next();
    });

    router.post(
      {
        path: '/',
        validate: {
          body: schema.object({
            term: schema.string(),
          }),
        },
      },
      (context, req, res) => res.ok({ body: req.body.term })
    );

    await server.start();

    await supertest(innerServer.listener)
      .post('/')
      .send({
        term: 'foo',
      })
      .expect(200, 'foo');

    expect(requestBody).toStrictEqual({});
  });
});
