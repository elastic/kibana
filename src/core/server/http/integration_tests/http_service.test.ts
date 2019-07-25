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
import Boom from 'boom';
import { Request } from 'hapi';
import { first } from 'rxjs/operators';
import { clusterClientMock } from './http_service.test.mocks';

import { Router } from '../router';
import * as kbnTestServer from '../../../../test_utils/kbn_server';

interface User {
  id: string;
  roles?: string[];
}

interface StorageData {
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
        validate: (session: StorageData) => true,
        isSecure: false,
        path: '/',
      };

      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);

      afterEach(async () => {
        clusterClientMock.mockClear();
        await root.shutdown();
      });

      it('runs auth for legacy routes and proxy request to legacy server route handlers', async () => {
        const { http } = await root.setup();
        const sessionStorageFactory = await http.createCookieSessionStorageFactory<StorageData>(
          cookieOptions
        );
        http.registerAuth((req, t) => {
          if (req.headers.authorization) {
            const user = { id: '42' };
            const sessionStorage = sessionStorageFactory.asScoped(req);
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return t.authenticated({ state: user });
          } else {
            return t.rejected(Boom.unauthorized());
          }
        });
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

        expect(response.header['set-cookie']).toHaveLength(1);
      });

      it('passes authHeaders as request headers to the legacy platform', async () => {
        const token = 'Basic: name:password';
        const { http } = await root.setup();
        const sessionStorageFactory = await http.createCookieSessionStorageFactory<StorageData>(
          cookieOptions
        );
        http.registerAuth((req, t) => {
          if (req.headers.authorization) {
            const user = { id: '42' };
            const sessionStorage = sessionStorageFactory.asScoped(req);
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return t.authenticated({
              state: user,
              requestHeaders: {
                authorization: token,
              },
            });
          } else {
            return t.rejected(Boom.unauthorized());
          }
        });
        await root.start();

        const legacyUrl = '/legacy';
        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: legacyUrl,
          handler: (req: Request) => ({
            authorization: req.headers.authorization,
            custom: req.headers.custom,
          }),
        });

        await kbnTestServer.request
          .get(root, legacyUrl)
          .set({ custom: 'custom-header' })
          .expect(200, { authorization: token, custom: 'custom-header' });
      });

      it('passes associated auth state to Legacy platform', async () => {
        const user = { id: '42' };

        const { http } = await root.setup();
        const sessionStorageFactory = await http.createCookieSessionStorageFactory<StorageData>(
          cookieOptions
        );
        http.registerAuth((req, t) => {
          if (req.headers.authorization) {
            const sessionStorage = sessionStorageFactory.asScoped(req);
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return t.authenticated({ state: user });
          } else {
            return t.rejected(Boom.unauthorized());
          }
        });
        await root.start();

        const legacyUrl = '/legacy';
        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: legacyUrl,
          handler: kbnServer.newPlatform.setup.core.http.auth.get,
        });

        const response = await kbnTestServer.request.get(root, legacyUrl).expect(200);
        expect(response.body.state).toEqual(user);
        expect(response.body.status).toEqual('authenticated');

        expect(response.header['set-cookie']).toHaveLength(1);
      });

      it('rewrites authorization header via authHeaders to make a request to Elasticsearch', async () => {
        const authHeaders = { authorization: 'Basic: user:password' };
        const { http, elasticsearch } = await root.setup();
        const { registerAuth, registerRouter } = http;

        await registerAuth((req, t) => {
          return t.authenticated({ requestHeaders: authHeaders });
        });

        const router = new Router('/new-platform');
        router.get({ path: '/', validate: false }, async (req, res) => {
          const client = await elasticsearch.dataClient$.pipe(first()).toPromise();
          client.asScoped(req);
          return res.ok({ header: 'ok' });
        });
        registerRouter(router);

        await root.start();

        await kbnTestServer.request.get(root, '/new-platform/').expect(200);
        expect(clusterClientMock).toBeCalledTimes(1);
        const [firstCall] = clusterClientMock.mock.calls;
        const [, , headers] = firstCall;
        expect(headers).toEqual(authHeaders);
      });

      it('passes request authorization header to Elasticsearch if registerAuth was not set', async () => {
        const authorizationHeader = 'Basic: username:password';
        const { http, elasticsearch } = await root.setup();
        const { registerRouter } = http;

        const router = new Router('/new-platform');
        router.get({ path: '/', validate: false }, async (req, res) => {
          const client = await elasticsearch.dataClient$.pipe(first()).toPromise();
          client.asScoped(req);
          return res.ok({ header: 'ok' });
        });
        registerRouter(router);

        await root.start();

        await kbnTestServer.request
          .get(root, '/new-platform/')
          .set('Authorization', authorizationHeader)
          .expect(200);

        expect(clusterClientMock).toBeCalledTimes(1);
        const [firstCall] = clusterClientMock.mock.calls;
        const [, , headers] = firstCall;
        expect(headers).toEqual({
          authorization: authorizationHeader,
        });
      });

      it('attach security header to a successful response handled by Legacy platform', async () => {
        const authResponseHeader = {
          'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
        };
        const { http } = await root.setup();
        const { registerAuth } = http;

        await registerAuth((req, t) => {
          return t.authenticated({ responseHeaders: authResponseHeader });
        });

        await root.start();

        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: '/legacy',
          handler: () => 'ok',
        });

        const response = await kbnTestServer.request.get(root, '/legacy').expect(200);
        expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
      });

      it('attach security header to an error response handled by Legacy platform', async () => {
        const authResponseHeader = {
          'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
        };
        const { http } = await root.setup();
        const { registerAuth } = http;

        await registerAuth((req, t) => {
          return t.authenticated({ responseHeaders: authResponseHeader });
        });

        await root.start();

        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: '/legacy',
          handler: () => {
            throw Boom.badRequest();
          },
        });

        const response = await kbnTestServer.request.get(root, '/legacy').expect(400);
        expect(response.header['www-authenticate']).toBe(authResponseHeader['www-authenticate']);
      });
    });

    describe('#registerOnPostAuth()', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);
      afterEach(async () => await root.shutdown());

      it('supports passing request through to the route handler', async () => {
        const router = new Router('/new-platform');
        router.get({ path: '/', validate: false }, async (req, res) => res.ok({ content: 'ok' }));

        const { http } = await root.setup();
        http.registerOnPostAuth((req, t) => t.next());
        http.registerOnPostAuth(async (req, t) => {
          await Promise.resolve();
          return t.next();
        });
        http.registerRouter(router);
        await root.start();

        await kbnTestServer.request.get(root, '/new-platform/').expect(200, { content: 'ok' });
      });

      it('supports redirecting to configured url', async () => {
        const redirectTo = '/redirect-url';
        const { http } = await root.setup();
        http.registerOnPostAuth(async (req, t) => t.redirected(redirectTo));
        await root.start();

        const response = await kbnTestServer.request.get(root, '/new-platform/').expect(302);
        expect(response.header.location).toBe(redirectTo);
      });

      it('fails a request with configured error and status code', async () => {
        const { http } = await root.setup();
        http.registerOnPostAuth(async (req, t) =>
          t.rejected(new Error('unexpected error'), { statusCode: 400 })
        );
        await root.start();

        await kbnTestServer.request
          .get(root, '/new-platform/')
          .expect(400, { statusCode: 400, error: 'Bad Request', message: 'unexpected error' });
      });

      it(`doesn't expose internal error details`, async () => {
        const { http } = await root.setup();
        http.registerOnPostAuth(async (req, t) => {
          throw new Error('sensitive info');
        });
        await root.start();

        await kbnTestServer.request.get(root, '/new-platform/').expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });

      it(`doesn't share request object between interceptors`, async () => {
        const { http } = await root.setup();
        http.registerOnPostAuth(async (req, t) => {
          // @ts-ignore. don't complain customField is not defined on Request type
          req.customField = { value: 42 };
          return t.next();
        });
        http.registerOnPostAuth((req, t) => {
          // @ts-ignore don't complain customField is not defined on Request type
          if (typeof req.customField !== 'undefined') {
            throw new Error('Request object was mutated');
          }
          return t.next();
        });
        const router = new Router('/new-platform');
        router.get({ path: '/', validate: false }, async (req, res) =>
          // @ts-ignore. don't complain customField is not defined on Request type
          res.ok({ customField: String(req.customField) })
        );
        http.registerRouter(router);
        await root.start();

        await kbnTestServer.request
          .get(root, '/new-platform/')
          .expect(200, { customField: 'undefined' });
      });
    });

    describe('#registerOnPostAuth() toolkit', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);

      afterEach(async () => await root.shutdown());
      it('supports Url change on the flight', async () => {
        const { http } = await root.setup();
        http.registerOnPreAuth((req, t) => {
          return t.redirected('/new-platform/new-url', { forward: true });
        });

        const router = new Router('/new-platform');
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
        http.registerOnPreAuth((req, t) => {
          return t.redirected(newUrl, { forward: true });
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

    describe('#basePath()', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot();
      }, 30000);

      afterEach(async () => await root.shutdown());
      it('basePath information for an incoming request is available in legacy server', async () => {
        const reqBasePath = '/requests-specific-base-path';
        const { http } = await root.setup();
        http.registerOnPreAuth((req, t) => {
          http.basePath.set(req, reqBasePath);
          return t.next();
        });

        await root.start();

        const legacyUrl = '/legacy';
        const kbnServer = kbnTestServer.getKbnServer(root);
        kbnServer.server.route({
          method: 'GET',
          path: legacyUrl,
          handler: kbnServer.newPlatform.setup.core.http.basePath.get,
        });

        await kbnTestServer.request.get(root, legacyUrl).expect(200, reqBasePath);
      });
    });
  });
});
