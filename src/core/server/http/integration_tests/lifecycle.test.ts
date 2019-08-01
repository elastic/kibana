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
import { ByteSizeValue } from '@kbn/config-schema';
import request from 'request';

import { HttpConfig, Router } from '..';
import { ensureRawRequest } from '../router';
import { HttpServer } from '../http_server';

import { LoggerFactory } from '../../logging';
import { loggingServiceMock } from '../../logging/logging_service.mock';

let server: HttpServer;
let logger: LoggerFactory;

const config = {
  host: '127.0.0.1',
  maxPayload: new ByteSizeValue(1024),
  port: 10001,
  ssl: { enabled: false },
} as HttpConfig;

interface User {
  id: string;
  roles?: string[];
}

interface StorageData {
  value: User;
  expires: number;
}

beforeEach(() => {
  logger = loggingServiceMock.create();
  server = new HttpServer(logger, 'tests');
});

afterEach(async () => {
  await server.stop();
});

describe('OnPreAuth', () => {
  it('supports registering request inceptors', async () => {
    const router = new Router('/');

    router.get({ path: '/', validate: false }, (req, res) => res.ok('ok'));

    const { registerRouter, registerOnPreAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

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

    await supertest(innerServer.listener)
      .get('/')
      .expect(200, 'ok');

    expect(callingOrder).toEqual(['first', 'second']);
  });

  it('supports request forwarding to specified url', async () => {
    const router = new Router('/');

    router.get({ path: '/initial', validate: false }, (req, res) => res.ok('initial'));
    router.get({ path: '/redirectUrl', validate: false }, (req, res) => res.ok('redirected'));

    const { registerRouter, registerOnPreAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

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

    await supertest(innerServer.listener)
      .get('/initial')
      .expect(200, 'redirected');

    expect(urlBeforeForwarding).toBe('/initial');
    expect(urlAfterForwarding).toBe('/redirectUrl');
  });

  it('supports redirection from the interceptor', async () => {
    const router = new Router('/');
    const redirectUrl = '/redirectUrl';
    router.get({ path: '/initial', validate: false }, (req, res) => res.ok('initial'));

    const { registerRouter, registerOnPreAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPreAuth((req, res, t) =>
      res.redirected(undefined, {
        headers: {
          location: redirectUrl,
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/initial')
      .expect(302);

    expect(result.header.location).toBe(redirectUrl);
  });

  it('supports rejecting request and adjusting response headers', async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok(undefined));

    const { registerRouter, registerOnPreAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPreAuth((req, res, t) =>
      res.unauthorized('not found error', {
        headers: {
          'www-authenticate': 'challenge',
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(401);

    expect(result.header['www-authenticate']).toBe('challenge');
  });

  it("doesn't expose error details if interceptor throws", async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok(undefined));

    const { registerRouter, registerOnPreAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPreAuth((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      [Error: reason],
                    ],
                  ]
            `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok('ok'));

    const { registerRouter, registerOnPreAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPreAuth((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      [Error: Unexpected result from OnPreAuth. Expected OnPreAuthResult or KibanaResponse, but given: [object Object].],
                    ],
                  ]
            `);
  });
  it(`doesn't share request object between interceptors`, async () => {
    const { registerRouter, registerOnPreAuth, server: innerServer } = await server.setup(config);
    registerOnPreAuth((req, res, t) => {
      // @ts-ignore. don't complain customField is not defined on Request type
      req.customField = { value: 42 };
      return t.next();
    });
    registerOnPreAuth((req, res, t) => {
      // @ts-ignore don't complain customField is not defined on Request type
      if (typeof req.customField !== 'undefined') {
        throw new Error('Request object was mutated');
      }
      return t.next();
    });
    const router = new Router('/');
    router.get({ path: '/', validate: false }, async (req, res) =>
      // @ts-ignore. don't complain customField is not defined on Request type
      res.ok({ customField: String(req.customField) })
    );
    registerRouter(router);
    await server.start();

    await supertest(innerServer.listener)
      .get('/')
      .expect(200, { customField: 'undefined' });
  });
});

describe('OnPostAuth', () => {
  it('supports registering request inceptors', async () => {
    const router = new Router('/');

    router.get({ path: '/', validate: false }, (req, res) => res.ok('ok'));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

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

    await supertest(innerServer.listener)
      .get('/')
      .expect(200, 'ok');

    expect(callingOrder).toEqual(['first', 'second']);
  });

  it('supports redirection from the interceptor', async () => {
    const router = new Router('/');
    const redirectUrl = '/redirectUrl';
    router.get({ path: '/initial', validate: false }, (req, res) => res.ok('initial'));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) =>
      res.redirected(undefined, {
        headers: {
          location: redirectUrl,
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/initial')
      .expect(302);

    expect(result.header.location).toBe(redirectUrl);
  });

  it('supports rejecting request and adjusting response headers', async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok(undefined));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) =>
      res.unauthorized('not found error', {
        headers: {
          'www-authenticate': 'challenge',
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(401);

    expect(result.header['www-authenticate']).toBe('challenge');
  });

  it("doesn't expose error details if interceptor throws", async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok(undefined));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      [Error: reason],
                    ],
                  ]
            `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok('ok'));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      [Error: Unexpected result from OnPostAuth. Expected OnPostAuthResult or KibanaResponse, but given: [object Object].],
                    ],
                  ]
            `);
  });
  it(`doesn't share request object between interceptors`, async () => {
    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerOnPostAuth((req, res, t) => {
      // @ts-ignore. don't complain customField is not defined on Request type
      req.customField = { value: 42 };
      return t.next();
    });
    registerOnPostAuth((req, res, t) => {
      // @ts-ignore don't complain customField is not defined on Request type
      if (typeof req.customField !== 'undefined') {
        throw new Error('Request object was mutated');
      }
      return t.next();
    });
    const router = new Router('/');
    router.get({ path: '/', validate: false }, async (req, res) =>
      // @ts-ignore. don't complain customField is not defined on Request type
      res.ok({ customField: String(req.customField) })
    );
    registerRouter(router);
    await server.start();

    await supertest(innerServer.listener)
      .get('/')
      .expect(200, { customField: 'undefined' });
  });
});

describe('Auth', () => {
  const cookieOptions = {
    name: 'sid',
    encryptionKey: 'something_at_least_32_characters',
    validate: () => true,
    isSecure: false,
  };

  it('registers auth request interceptor only once', async () => {
    const { registerAuth } = await server.setup(config);
    const doRegister = () => registerAuth(() => null as any);

    doRegister();
    expect(doRegister).toThrowError('Auth interceptor was already registered');
  });

  it('may grant access to a resource', async () => {
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
    const router = new Router('');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
    registerRouter(router);

    registerAuth((req, res, t) => t.authenticated());
    await server.start();

    await supertest(innerServer.listener)
      .get('/')
      .expect(200, { content: 'ok' });
  });

  it('enables auth for a route by default if registerAuth has been called', async () => {
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

    const router = new Router('');
    router.get({ path: '/', validate: false }, (req, res) =>
      res.ok({ authRequired: req.route.options.authRequired })
    );
    registerRouter(router);

    const authenticate = jest.fn().mockImplementation((req, res, t) => t.authenticated());
    registerAuth(authenticate);

    await server.start();
    await supertest(innerServer.listener)
      .get('/')
      .expect(200, { authRequired: true });

    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  test('supports disabling auth for a route explicitly', async () => {
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

    const router = new Router('');
    router.get({ path: '/', validate: false, options: { authRequired: false } }, (req, res) =>
      res.ok({ authRequired: req.route.options.authRequired })
    );
    registerRouter(router);
    const authenticate = jest.fn();
    registerAuth(authenticate);

    await server.start();
    await supertest(innerServer.listener)
      .get('/')
      .expect(200, { authRequired: false });

    expect(authenticate).toHaveBeenCalledTimes(0);
  });

  test('supports enabling auth for a route explicitly', async () => {
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

    const router = new Router('');
    router.get({ path: '/', validate: false, options: { authRequired: true } }, (req, res) =>
      res.ok({ authRequired: req.route.options.authRequired })
    );
    registerRouter(router);
    const authenticate = jest.fn().mockImplementation((req, res, t) => t.authenticated({}));
    await registerAuth(authenticate);

    await server.start();
    await supertest(innerServer.listener)
      .get('/')
      .expect(200, { authRequired: true });

    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it('supports rejecting a request from an unauthenticated user', async () => {
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
    const router = new Router('');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
    registerRouter(router);

    registerAuth((req, res) => res.unauthorized());
    await server.start();

    await supertest(innerServer.listener)
      .get('/')
      .expect(401);
  });

  it('supports redirecting', async () => {
    const redirectTo = '/redirect-url';
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
    const router = new Router('');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
    registerRouter(router);

    registerAuth((req, res) =>
      res.redirected(undefined, {
        headers: {
          location: redirectTo,
        },
      })
    );
    await server.start();

    const response = await supertest(innerServer.listener)
      .get('/')
      .expect(302);
    expect(response.header.location).toBe(redirectTo);
  });

  it(`doesn't expose internal error details`, async () => {
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);
    const router = new Router('');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));
    registerRouter(router);

    registerAuth((req, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('allows manipulating cookies via cookie session storage', async () => {
    const router = new Router('');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));

    const {
      createCookieSessionStorageFactory,
      registerAuth,
      registerRouter,
      server: innerServer,
    } = await server.setup(config);
    const sessionStorageFactory = await createCookieSessionStorageFactory<StorageData>(
      cookieOptions
    );
    registerAuth((req, res, toolkit) => {
      const user = { id: '42' };
      const sessionStorage = sessionStorageFactory.asScoped(req);
      sessionStorage.set({ value: user, expires: Date.now() + 1000 });
      return toolkit.authenticated({ state: user });
    });
    registerRouter(router);
    await server.start();

    const response = await supertest(innerServer.listener)
      .get('/')
      .expect(200, { content: 'ok' });

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
      registerRouter,
      server: innerServer,
    } = await server.setup(config);
    const sessionStorageFactory = await createCookieSessionStorageFactory<StorageData>(
      cookieOptions
    );
    registerAuth((req, res, toolkit) => {
      const user = { id: '42' };
      const sessionStorage = sessionStorageFactory.asScoped(req);
      sessionStorage.set({ value: user, expires: Date.now() + 1000 });
      return toolkit.authenticated();
    });

    const router = new Router('');
    router.get({ path: '/', validate: false }, (req, res) => res.ok({ content: 'ok' }));
    router.get({ path: '/with-cookie', validate: false }, (req, res) => {
      const sessionStorage = sessionStorageFactory.asScoped(req);
      sessionStorage.clear();
      return res.ok({ content: 'ok' });
    });
    registerRouter(router);

    await server.start();

    const responseToSetCookie = await supertest(innerServer.listener)
      .get('/')
      .expect(200);

    expect(responseToSetCookie.header['set-cookie']).toBeDefined();

    const responseToResetCookie = await supertest(innerServer.listener)
      .get('/with-cookie')
      .expect(200);

    expect(responseToResetCookie.header['set-cookie']).toEqual([
      'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/',
    ]);
  });

  it.skip('is the only place with access to the authorization header', async () => {
    const token = 'Basic: user:password';
    const {
      registerAuth,
      registerOnPreAuth,
      registerOnPostAuth,
      registerRouter,
      server: innerServer,
    } = await server.setup(config);

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
    const router = new Router('');
    router.get({ path: '/', validate: false }, (req, res) => {
      fromRouteHandler = req.headers.authorization;
      return res.ok({ content: 'ok' });
    });
    registerRouter(router);

    await server.start();

    await supertest(innerServer.listener)
      .get('/')
      .set('Authorization', token)
      .expect(200);

    expect(fromRegisterOnPreAuth).toEqual({});
    expect(fromRegisterAuth).toEqual({ authorization: token });
    expect(fromRegisterOnPostAuth).toEqual({});
    expect(fromRouteHandler).toEqual({});
  });

  it('attach security header to a successful response', async () => {
    const authResponseHeader = {
      'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
    };
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok({ header: 'ok' }));
    registerRouter(router);

    await server.start();

    const response = await supertest(innerServer.listener)
      .get('/')
      .expect(200);

    expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
  });

  it('attach security header to an error response', async () => {
    const authResponseHeader = {
      'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
    };
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.badRequest(new Error('reason')));
    registerRouter(router);

    await server.start();

    const response = await supertest(innerServer.listener)
      .get('/')
      .expect(400);

    expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
  });

  it('logs warning if Auth Security Header rewrites response header for success response', async () => {
    const authResponseHeader = {
      'www-authenticate': 'from auth interceptor',
    };
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) =>
      res.ok(
        {},
        {
          headers: {
            'www-authenticate': 'from handler',
          },
        }
      )
    );
    registerRouter(router);

    await server.start();

    const response = await supertest(innerServer.listener)
      .get('/')
      .expect(200);

    expect(response.header['www-authenticate']).toBe('from auth interceptor');
    expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "Server rewrites a response header [www-authenticate].",
        ],
      ]
    `);
  });

  it('logs warning if Auth Security Header rewrites response header for error response', async () => {
    const authResponseHeader = {
      'www-authenticate': 'from auth interceptor',
    };
    const { registerAuth, registerRouter, server: innerServer } = await server.setup(config);

    registerAuth((req, res, toolkit) => {
      return toolkit.authenticated({ responseHeaders: authResponseHeader });
    });

    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) =>
      res.badRequest('reason', {
        headers: {
          'www-authenticate': 'from handler',
        },
      })
    );
    registerRouter(router);

    await server.start();

    const response = await supertest(innerServer.listener)
      .get('/')
      .expect(400);

    expect(response.header['www-authenticate']).toBe('from auth interceptor');
    expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot(`
      Array [
        Array [
          "Server rewrites a response header [www-authenticate].",
        ],
      ]
    `);
  });

  it('supports redirection from the interceptor', async () => {
    const router = new Router('/');
    const redirectUrl = '/redirectUrl';
    router.get({ path: '/initial', validate: false }, (req, res) => res.ok('initial'));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) =>
      res.redirected(undefined, {
        headers: {
          location: redirectUrl,
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/initial')
      .expect(302);

    expect(result.header.location).toBe(redirectUrl);
  });

  it('supports rejecting request and adjusting response headers', async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok(undefined));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) =>
      res.unauthorized('not found error', {
        headers: {
          'www-authenticate': 'challenge',
        },
      })
    );
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(401);

    expect(result.header['www-authenticate']).toBe('challenge');
  });

  it("doesn't expose error details if interceptor throws", async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok(undefined));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) => {
      throw new Error('reason');
    });
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: reason],
        ],
      ]
    `);
  });

  it('returns internal error if interceptor returns unexpected result', async () => {
    const router = new Router('/');
    router.get({ path: '/', validate: false }, (req, res) => res.ok('ok'));

    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerRouter(router);

    registerOnPostAuth((req, res, t) => ({} as any));
    await server.start();

    const result = await supertest(innerServer.listener)
      .get('/')
      .expect(500);

    expect(result.body.error).toBe('An internal server error occurred.');
    expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
      Array [
        Array [
          [Error: Unexpected result from OnPostAuth. Expected OnPostAuthResult or KibanaResponse, but given: [object Object].],
        ],
      ]
    `);
  });
  it(`doesn't share request object between interceptors`, async () => {
    const { registerRouter, registerOnPostAuth, server: innerServer } = await server.setup(config);
    registerOnPostAuth((req, res, t) => {
      // @ts-ignore. don't complain customField is not defined on Request type
      req.customField = { value: 42 };
      return t.next();
    });
    registerOnPostAuth((req, res, t) => {
      // @ts-ignore don't complain customField is not defined on Request type
      if (typeof req.customField !== 'undefined') {
        throw new Error('Request object was mutated');
      }
      return t.next();
    });
    const router = new Router('/');
    router.get({ path: '/', validate: false }, async (req, res) =>
      // @ts-ignore. don't complain customField is not defined on Request type
      res.ok({ customField: String(req.customField) })
    );
    registerRouter(router);
    await server.start();

    await supertest(innerServer.listener)
      .get('/')
      .expect(200, { customField: 'undefined' });
  });
});
