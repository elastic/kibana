/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { parse as parseCookie } from 'tough-cookie';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { HttpService } from '@kbn/core-http-server-internal';
import { createHttpService } from '@kbn/core-http-server-mocks';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/repo-info';
import { getEnvOptions } from '@kbn/config-mocks';

let server: HttpService;

let logger: ReturnType<typeof loggingSystemMock.create>;

const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
  executionContext: executionContextServiceMock.createInternalSetupContract(),
};

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

beforeEach(async () => {
  logger = loggingSystemMock.create();
  server = createHttpService({ logger });
  await server.preboot({ context: contextServiceMock.createPrebootContract() });
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

describe('OnPreRouting', () => {
  it('supports registering a request interceptor', async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    const callingOrder: string[] = [];
    registerOnPreRouting((req, res, t) => {
      callingOrder.push('first');
      return t.next();
    });

    registerOnPreRouting((req, res, t) => {
      callingOrder.push('second');
      return t.next();
    });
    await server.start();

    await supertest(innerServer.listener).get('/').expect(200, 'ok');

    expect(callingOrder).toEqual(['first', 'second']);
  });

  it('supports request forwarding to specified url', async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/initial', validate: false }, (context, req, res) =>
      res.ok({ body: 'initial' })
    );
    router.get({ path: '/redirectUrl', validate: false }, (context, req, res) =>
      res.ok({ body: 'redirected' })
    );

    let urlBeforeForwarding;
    registerOnPreRouting((req, res, t) => {
      urlBeforeForwarding = ensureRawRequest(req).raw.req.url;
      return t.rewriteUrl('/redirectUrl');
    });

    let urlAfterForwarding;
    registerOnPreRouting((req, res, t) => {
      // used by legacy platform
      urlAfterForwarding = ensureRawRequest(req).raw.req.url;
      return t.next();
    });

    await server.start();

    await supertest(innerServer.listener).get('/initial').expect(200, 'redirected');

    expect(urlBeforeForwarding).toBe('/initial');
    expect(urlAfterForwarding).toBe('/redirectUrl');
  });

  it('provides original request url', async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/login', validate: false }, (context, req, res) => {
      return res.ok({
        body: {
          rewrittenUrl: req.rewrittenUrl
            ? `${req.rewrittenUrl.pathname}${req.rewrittenUrl.search}`
            : undefined,
        },
      });
    });

    registerOnPreRouting((req, res, t) => t.rewriteUrl('/login'));

    await server.start();

    await supertest(innerServer.listener)
      .get('/initial?name=foo')
      .expect(200, { rewrittenUrl: '/initial?name=foo' });
  });

  it('provides original request url if rewritten several times', async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/reroute-2', validate: false }, (context, req, res) => {
      return res.ok({
        body: {
          rewrittenUrl: req.rewrittenUrl
            ? `${req.rewrittenUrl.pathname}${req.rewrittenUrl.search}`
            : undefined,
        },
      });
    });

    registerOnPreRouting((req, res, t) => t.rewriteUrl('/reroute-1'));
    registerOnPreRouting((req, res, t) => t.rewriteUrl('/reroute-2'));

    await server.start();

    await supertest(innerServer.listener)
      .get('/initial?name=foo')
      .expect(200, { rewrittenUrl: '/initial?name=foo' });
  });

  it('does not provide request url if interceptor does not rewrite url', async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/login', validate: false }, (context, req, res) => {
      return res.ok({
        body: {
          rewrittenUrl: req.rewrittenUrl
            ? `${req.rewrittenUrl.pathname}${req.rewrittenUrl.search}`
            : undefined,
        },
      });
    });

    registerOnPreRouting((req, res, t) => t.next());

    await server.start();

    await supertest(innerServer.listener).get('/login').expect(200, {});
  });

  it('supports redirection from the interceptor', async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    const redirectUrl = '/redirectUrl';
    router.get({ path: '/initial', validate: false }, (context, req, res) => res.ok());

    registerOnPreRouting((req, res, t) =>
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
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());

    registerOnPreRouting((req, res, t) =>
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
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());

    registerOnPreRouting((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());

    registerOnPreRouting((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from OnPreRouting. Expected OnPreRoutingResult or KibanaResponse, but given: [object Object].],
        ],
      ]
    `);
  });

  it(`doesn't share request object between interceptors`, async () => {
    const {
      registerOnPreRouting,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    registerOnPreRouting((req, res, t) => {
      // don't complain customField is not defined on Request type
      (req as any).customField = { value: 42 };
      return t.next();
    });
    registerOnPreRouting((req, res, t) => {
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
});

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

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
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

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
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
      // @ts-expect-error customField property is not defined on request object
      req.customField = { value: 42 };
      return t.next();
    });
    registerOnPreAuth((req, res, t) => {
      // @ts-expect-error customField property is not defined on request object
      if (typeof req.customField !== 'undefined') {
        throw new Error('Request object was mutated');
      }
      return t.next();
    });
    router.get({ path: '/', validate: false }, (context, req, res) =>
      // @ts-expect-error customField property is not defined on request object
      res.ok({ body: { customField: String(req.customField) } })
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

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
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

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
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

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
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

    const sessionCookie = parseCookie(cookies[0]);
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
      registerOnPreRouting,
      registerAuth,
      registerOnPostAuth,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    let fromregisterOnPreRouting;
    await registerOnPreRouting((req, res, toolkit) => {
      fromregisterOnPreRouting = req.headers.authorization;
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

    expect(fromregisterOnPreRouting).toEqual({});
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
    expect(loggingSystemMock.collect(logger).warn[1]).toMatchInlineSnapshot(`
      Array [
        "onPreResponseHandler rewrote a response header [www-authenticate].",
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
          "Access to uri [/] with method [get] is deprecated",
        ],
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

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
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

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
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
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
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
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
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
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
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

    expect(loggingSystemMock.collect(logger).warn[1]).toMatchInlineSnapshot(`
      Array [
        "onPreResponseHandler rewrote a response header [x-kibana-header].",
      ]
    `);
  });

  it("doesn't expose error details if interceptor throws", async () => {
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok(undefined));
    registerOnPreResponse((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok());
    registerOnPreResponse((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(500);

    expect(result.body.message).toBe(
      'An internal server error occurred. Check Kibana server logs for details.'
    );
    expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from OnPreResponse. Expected OnPreResponseResult, but given: [object Object].],
        ],
      ]
    `);
  });

  it('cannot change response statusCode', async () => {
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
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
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
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

  it('supports rendering a different response body', async () => {
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => {
      return res.ok({
        headers: {
          'Original-Header-A': 'A',
        },
        body: 'original',
      });
    });

    registerOnPreResponse((req, res, t) => {
      return t.render({ body: 'overridden' });
    });

    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(200, 'overridden');

    expect(result.header['original-header-a']).toBe('A');
  });

  it('supports rendering a different response body + headers', async () => {
    const {
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) => {
      return res.ok({
        headers: {
          'Original-Header-A': 'A',
          'Original-Header-B': 'B',
        },
        body: 'original',
      });
    });

    registerOnPreResponse((req, res, t) => {
      return t.render({
        headers: {
          'Original-Header-A': 'AA',
          'New-Header-C': 'C',
        },
        body: 'overridden',
      });
    });

    await server.start();

    const result = await supertest(innerServer.listener).get('/').expect(200, 'overridden');

    expect(result.header['original-header-a']).toBe('AA');
    expect(result.header['original-header-b']).toBe('B');
    expect(result.header['new-header-c']).toBe('C');
  });
});

describe('runs with default preResponse handlers', () => {
  it('does not allow overwriting of the "kbn-name", "Content-Security-Policy" and  "Content-Security-Policy-Report-Only" headers', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get({ path: '/', validate: false }, (context, req, res) =>
      res.ok({
        headers: {
          foo: 'bar',
          'kbn-name': 'hijacked!',
          'Content-Security-Policy': 'hijacked!',
          'Content-Security-Policy-Report-Only': 'hijacked!',
        },
      })
    );
    await server.start();

    const response = await supertest(innerServer.listener).get('/').expect(200);

    expect(response.header.foo).toBe('bar');
    expect(response.header['kbn-name']).toBe('kibana');
    expect(response.header['content-security-policy']).toBe(
      `script-src 'report-sample' 'self' 'unsafe-eval'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'`
    );
    expect(response.header['content-security-policy-report-only']).toBe(
      `form-action 'report-sample' 'self'; object-src 'report-sample' 'none'`
    );
  });
});

describe('runs with default preResponse deprecation handlers', () => {
  const deprecationMessage = 'This is a deprecated endpoint for testing reasons';
  const warningString = `299 Kibana-${kibanaVersion} "${deprecationMessage}"`;

  it('should handle a deprecated route and include deprecation warning headers', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      {
        path: '/deprecated',
        validate: false,
        options: {
          deprecated: {
            documentationUrl: 'https://fake-url.com',
            reason: { type: 'deprecate' },
            severity: 'warning',
            message: deprecationMessage,
          },
        },
      },
      (context, req, res) => res.ok({})
    );

    await server.start();

    const response = await supertest(innerServer.listener).get('/deprecated').expect(200);

    expect(response.header.warning).toMatch(warningString);
  });

  it('should not add a deprecation warning header to a non deprecated route', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.get(
      {
        path: '/test',
        validate: false,
      },
      (context, req, res) => res.ok({})
    );

    await server.start();

    const response = await supertest(innerServer.listener).get('/test').expect(200);

    expect(response.header.warning).toBeUndefined();
  });

  it('should not overwrite the warning header if it was already set', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    const expectedWarningHeader = 'This should not get overwritten';

    router.get(
      {
        path: '/deprecated',
        validate: false,
        options: {
          deprecated: {
            documentationUrl: 'https://fake-url.com',
            reason: { type: 'deprecate' },
            severity: 'warning',
            message: deprecationMessage,
          },
        },
      },
      (context, req, res) => res.ok({ headers: { warning: expectedWarningHeader } })
    );

    await server.start();

    const response = await supertest(innerServer.listener).get('/deprecated').expect(200);
    expect(response.header.warning).toMatch(expectedWarningHeader);
  });

  it('should return the warning header in deprecated v1 but not in non deprecated v2', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');

    router.versioned
      .get({
        access: 'internal',
        path: '/test',
      })
      .addVersion(
        {
          version: '1',
          validate: false,
          options: {
            deprecated: {
              documentationUrl: 'https://fake-url.com',
              reason: { type: 'deprecate' },
              severity: 'warning',
              message: deprecationMessage,
            },
          },
        },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '1' } });
        }
      )
      .addVersion(
        {
          version: '2',
          validate: false,
        },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '2' } });
        }
      );

    await server.start();

    let response = await supertest(innerServer.listener)
      .get('/test')
      .set('Elastic-Api-Version', '1')
      .expect(200);

    expect(response.body.v).toMatch('1');
    expect(response.header.warning).toMatch(warningString);

    response = await supertest(innerServer.listener)
      .get('/test')
      .set('Elastic-Api-Version', '2')
      .expect(200);

    expect(response.body.v).toMatch('2');
    expect(response.header.warning).toBeUndefined();
  });

  it('should not overwrite the warning header if it was already set (versioned)', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    const expectedWarningHeader = 'This should not get overwritten';

    router.versioned
      .get({
        access: 'internal',
        path: '/test',
      })
      .addVersion(
        {
          version: '1',
          validate: false,
          options: {
            deprecated: {
              documentationUrl: 'https://fake-url.com',
              reason: { type: 'deprecate' },
              severity: 'warning',
              message: deprecationMessage,
            },
          },
        },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '1' }, headers: { warning: expectedWarningHeader } });
        }
      )
      .addVersion(
        {
          version: '2',
          validate: false,
        },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '2' } });
        }
      );

    await server.start();

    let response = await supertest(innerServer.listener)
      .get('/test')
      .set('Elastic-Api-Version', '1')
      .expect(200);

    expect(response.body.v).toMatch('1');
    expect(response.header.warning).toMatch(expectedWarningHeader);

    response = await supertest(innerServer.listener)
      .get('/test')
      .set('Elastic-Api-Version', '2')
      .expect(200);

    expect(response.body.v).toMatch('2');
    expect(response.header.warning).toBeUndefined();
  });
});

describe('run interceptors in the right order', () => {
  it('with Auth registered', async () => {
    const {
      registerOnPreRouting,
      registerOnPreAuth,
      registerAuth,
      registerOnPostAuth,
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);

    const router = createRouter('/');

    const executionOrder: string[] = [];
    registerOnPreRouting((req, res, t) => {
      executionOrder.push('onPreRouting');
      return t.next();
    });
    registerOnPreAuth((req, res, t) => {
      executionOrder.push('onPreAuth');
      return t.next();
    });
    registerAuth((req, res, t) => {
      executionOrder.push('auth');
      return t.authenticated({});
    });
    registerOnPostAuth((req, res, t) => {
      executionOrder.push('onPostAuth');
      return t.next();
    });
    registerOnPreResponse((req, res, t) => {
      executionOrder.push('onPreResponse');
      return t.next();
    });

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200);
    expect(executionOrder).toEqual([
      'onPreRouting',
      'onPreAuth',
      'auth',
      'onPostAuth',
      'onPreResponse',
    ]);
  });

  it('with no Auth registered', async () => {
    const {
      registerOnPreRouting,
      registerOnPreAuth,
      registerOnPostAuth,
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);

    const router = createRouter('/');

    const executionOrder: string[] = [];
    registerOnPreRouting((req, res, t) => {
      executionOrder.push('onPreRouting');
      return t.next();
    });
    registerOnPreAuth((req, res, t) => {
      executionOrder.push('onPreAuth');
      return t.next();
    });
    registerOnPostAuth((req, res, t) => {
      executionOrder.push('onPostAuth');
      return t.next();
    });
    registerOnPreResponse((req, res, t) => {
      executionOrder.push('onPreResponse');
      return t.next();
    });

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    await server.start();

    await supertest(innerServer.listener).get('/').expect(200);
    expect(executionOrder).toEqual(['onPreRouting', 'onPreAuth', 'onPostAuth', 'onPreResponse']);
  });

  it('when a user failed auth', async () => {
    const {
      registerOnPreRouting,
      registerOnPreAuth,
      registerOnPostAuth,
      registerAuth,
      registerOnPreResponse,
      server: innerServer,
      createRouter,
    } = await server.setup(setupDeps);

    const router = createRouter('/');

    const executionOrder: string[] = [];
    registerOnPreRouting((req, res, t) => {
      executionOrder.push('onPreRouting');
      return t.next();
    });
    registerOnPreAuth((req, res, t) => {
      executionOrder.push('onPreAuth');
      return t.next();
    });
    registerAuth((req, res, t) => {
      executionOrder.push('auth');
      return res.forbidden();
    });
    registerOnPostAuth((req, res, t) => {
      executionOrder.push('onPostAuth');
      return t.next();
    });
    registerOnPreResponse((req, res, t) => {
      executionOrder.push('onPreResponse');
      return t.next();
    });

    router.get({ path: '/', validate: false }, (context, req, res) => res.ok({ body: 'ok' }));

    await server.start();

    await supertest(innerServer.listener).get('/').expect(403);
    expect(executionOrder).toEqual(['onPreRouting', 'onPreAuth', 'auth', 'onPreResponse']);
  });
});
