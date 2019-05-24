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

import { parse } from 'url';

import request from 'request';
import Boom from 'boom';

import { AuthenticationHandler } from '../../../../core/server';
import { Router } from '../router';

import * as kbnTestServer from '../../../../test_utils/kbn_server';

interface User {
  id: string;
  roles?: string[];
}

interface Storage {
  value: User;
  expires: number;
}

describe('http service', () => {
  describe('setup contract', () => {
    describe('#registerAuth()', () => {
      const sessionDurationMs = 1000;
      const cookieOptions = {
        name: 'sid',
        encryptionKey: 'something_at_least_32_characters',
        validate: (session: Storage) => true,
        isSecure: false,
        path: '/',
      };

      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);

      afterEach(async () => await root.shutdown());

      it('Should support implementing custom authentication logic', async () => {
        const router = new Router('');
        router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));

        const authenticate: AuthenticationHandler<Storage> = async (req, sessionStorage, t) => {
          if (req.headers.authorization) {
            const user = { id: '42' };
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return t.authenticated({ credentials: user });
          } else {
            return t.rejected(Boom.unauthorized());
          }
        };

        const { http } = await root.setup();
        http.registerAuth(authenticate, cookieOptions);
        http.registerRouter(router);
        await root.start();

        const response = await kbnTestServer.request.get(root, '/').expect(200, { content: 'ok' });

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

      it('Should support rejecting a request from an unauthenticated user', async () => {
        const authenticate: AuthenticationHandler<Storage> = async (req, sessionStorage, t) => {
          if (req.headers.authorization) {
            const user = { id: '42' };
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return t.authenticated({ credentials: user });
          } else {
            return t.rejected(Boom.unauthorized());
          }
        };

        const { http } = await root.setup();
        http.registerAuth(authenticate, cookieOptions);
        await root.start();

        await kbnTestServer.request
          .get(root, '/')
          .unset('Authorization')
          .expect(401);
      });

      it('Should support redirecting', async () => {
        const redirectTo = '/redirect-url';
        const authenticate: AuthenticationHandler<Storage> = async (req, sessionStorage, t) => {
          return t.redirected(redirectTo);
        };

        const { http } = await root.setup();
        http.registerAuth(authenticate, cookieOptions);
        await root.start();

        const response = await kbnTestServer.request.get(root, '/').expect(302);
        expect(response.header.location).toBe(redirectTo);
      });

      it('Should run auth for legacy routes and proxy request to legacy server route handlers', async () => {
        const authenticate: AuthenticationHandler<Storage> = async (req, sessionStorage, t) => {
          if (req.headers.authorization) {
            const user = { id: '42' };
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return t.authenticated({ credentials: user });
          } else {
            return t.rejected(Boom.unauthorized());
          }
        };

        const { http } = await root.setup();
        http.registerAuth(authenticate, cookieOptions);
        await root.start();

        const legacyUrl = '/legacy';
        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: legacyUrl,
          handler: () => 'ok from legacy server',
        });

        const response = await kbnTestServer.request
          .get(root, legacyUrl)
          .expect(200, 'ok from legacy server');

        expect(response.header['set-cookie']).toBe(undefined);
      });

      it(`Shouldn't expose internal error details`, async () => {
        const authenticate: AuthenticationHandler<Storage> = async (req, sessionStorage, t) => {
          throw new Error('sensitive info');
        };

        const { http } = await root.setup();
        http.registerAuth(authenticate, cookieOptions);
        await root.start();

        await kbnTestServer.request.get(root, '/').expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });
    });

    describe('#registerOnRequest()', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);
      afterEach(async () => await root.shutdown());

      it('Should support passing request through to the route handler', async () => {
        const router = new Router('');
        router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));

        const { http } = await root.setup();
        http.registerOnRequest((req, t) => t.next());
        http.registerOnRequest(async (req, t) => {
          await Promise.resolve();
          return t.next();
        });
        http.registerRouter(router);
        await root.start();

        await kbnTestServer.request.get(root, '/').expect(200, { content: 'ok' });
      });

      it('Should support redirecting to configured url', async () => {
        const redirectTo = '/redirect-url';
        const { http } = await root.setup();
        http.registerOnRequest(async (req, t) => t.redirected(redirectTo));
        await root.start();

        const response = await kbnTestServer.request.get(root, '/').expect(302);
        expect(response.header.location).toBe(redirectTo);
      });

      it('Should failing a request with configured error and status code', async () => {
        const { http } = await root.setup();
        http.registerOnRequest(async (req, t) =>
          t.rejected(new Error('unexpected error'), { statusCode: 400 })
        );
        await root.start();

        await kbnTestServer.request
          .get(root, '/')
          .expect(400, { statusCode: 400, error: 'Bad Request', message: 'unexpected error' });
      });

      it(`Shouldn't expose internal error details`, async () => {
        const { http } = await root.setup();
        http.registerOnRequest(async (req, t) => {
          throw new Error('sensitive info');
        });
        await root.start();

        await kbnTestServer.request.get(root, '/').expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });

      it(`Shouldn't share request object between interceptors`, async () => {
        const { http } = await root.setup();
        http.registerOnRequest(async (req, t) => {
          // @ts-ignore. don't complain customField is not defined on Request type
          req.customField = { value: 42 };
          return t.next();
        });
        http.registerOnRequest((req, t) => {
          // @ts-ignore don't complain customField is not defined on Request type
          if (typeof req.customField !== 'undefined') {
            throw new Error('Request object was mutated');
          }
          return t.next();
        });
        const router = new Router('');
        router.get({ path: '/', validate: false }, async (req, res) =>
          // @ts-ignore. don't complain customField is not defined on Request type
          res.ok({ customField: String(req.customField) })
        );
        http.registerRouter(router);
        await root.start();

        await kbnTestServer.request.get(root, '/').expect(200, { customField: 'undefined' });
      });
    });

    describe('#registerOnRequest() toolkit', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);

      afterEach(async () => await root.shutdown());
      it('supports Url change on the flight', async () => {
        const { http } = await root.setup();
        http.registerOnRequest((req, t) => {
          t.setUrl(parse('/new-url'));
          return t.next();
        });

        const router = new Router('/');
        router.get({ path: '/new-url', validate: false }, async (req, res) =>
          res.ok({ key: 'new-url-reached' })
        );
        http.registerRouter(router);

        await root.start();

        await kbnTestServer.request.get(root, '/').expect(200, { key: 'new-url-reached' });
      });

      it('url re-write works for legacy server as well', async () => {
        const { http } = await root.setup();
        const newUrl = '/new-url';
        http.registerOnRequest((req, t) => {
          t.setUrl(newUrl);
          return t.next();
        });

        await root.start();
        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: newUrl,
          handler: () => 'ok-from-legacy',
        });

        await kbnTestServer.request.get(root, '/').expect(200, 'ok-from-legacy');
      });
    });

    describe('#getBasePathFor()/#setBasePathFor()', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);

      afterEach(async () => await root.shutdown());
      it('basePath information for an incoming request is available in legacy server', async () => {
        const reqBasePath = '/requests-specific-base-path';
        const { http } = await root.setup();
        http.registerOnRequest((req, t) => {
          http.setBasePathFor(req, reqBasePath);
          return t.next();
        });

        await root.start();

        const legacyUrl = '/legacy';
        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: legacyUrl,
          handler: kbnServer.newPlatform.setup.core.http.getBasePathFor,
        });

        await kbnTestServer.request.get(root, legacyUrl).expect(200, reqBasePath);
      });
    });
  });
});
