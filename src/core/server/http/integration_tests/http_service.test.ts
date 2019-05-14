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

import path from 'path';
import { parse } from 'url';

import request from 'request';
import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { Router } from '../router';
import { url as authUrl } from './__fixtures__/plugins/dummy_security/server/plugin';
import { url as onReqUrl } from './__fixtures__/plugins/dummy_on_request/server/plugin';

describe('http service', () => {
  describe('setup contract', () => {
    describe('#registerAuth()', () => {
      const plugin = path.resolve(__dirname, './__fixtures__/plugins/dummy_security');
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeAll(async () => {
        root = kbnTestServer.createRoot(
          {
            plugins: { paths: [plugin] },
          },
          {
            dev: true,
          }
        );

        const router = new Router('');
        router.get({ path: authUrl.auth, validate: false }, async (req, res) =>
          res.ok({ content: 'ok' })
        );

        const { http } = await root.setup();
        http.registerRouter(router);
        await root.start();
      }, 30000);

      afterAll(async () => await root.shutdown());

      it('Should support implementing custom authentication logic', async () => {
        const response = await kbnTestServer.request
          .get(root, authUrl.auth)
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

      it('Should support rejecting a request from an unauthenticated user', async () => {
        await kbnTestServer.request
          .get(root, authUrl.auth)
          .unset('Authorization')
          .expect(401);
      });

      it('Should support redirecting', async () => {
        const response = await kbnTestServer.request.get(root, authUrl.authRedirect).expect(302);
        expect(response.header.location).toBe(authUrl.redirectTo);
      });

      it('Should run auth for legacy routes and proxy request to legacy server route handlers', async () => {
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
        await kbnTestServer.request.get(root, authUrl.exception).expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });
    });

    describe('#registerOnRequest()', () => {
      const plugin = path.resolve(__dirname, './__fixtures__/plugins/dummy_on_request');
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot(
          {
            plugins: { paths: [plugin] },
          },
          {
            dev: true,
          }
        );

        const router = new Router('');
        // routes with expected success status response should have handlers
        [onReqUrl.root, onReqUrl.independentReq].forEach(url =>
          router.get({ path: url, validate: false }, async (req, res) => res.ok({ content: 'ok' }))
        );

        const { http } = await root.setup();
        http.registerRouter(router);

        await root.start();
      }, 30000);

      afterEach(async () => await root.shutdown());
      it('Should support passing request through to the route handler', async () => {
        await kbnTestServer.request.get(root, onReqUrl.root).expect(200, { content: 'ok' });
      });
      it('Should support redirecting to configured url', async () => {
        const response = await kbnTestServer.request.get(root, onReqUrl.redirect).expect(302);
        expect(response.header.location).toBe(onReqUrl.redirectTo);
      });
      it('Should failing a request with configured error and status code', async () => {
        await kbnTestServer.request
          .get(root, onReqUrl.failed)
          .expect(400, { statusCode: 400, error: 'Bad Request', message: 'unexpected error' });
      });
      it(`Shouldn't expose internal error details`, async () => {
        await kbnTestServer.request.get(root, onReqUrl.exception).expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });
      it(`Shouldn't share request object between interceptors`, async () => {
        await kbnTestServer.request.get(root, onReqUrl.independentReq).expect(200);
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
