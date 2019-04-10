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
import request from 'request';
import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { Router } from '../router';
import { url } from './__fixtures__/plugins/dummy_security/server/plugin';

describe('http service', () => {
  describe('setup contract', () => {
    describe('#registerAuth()', () => {
      const dummySecurityPlugin = path.resolve(__dirname, './__fixtures__/plugins/dummy_security');
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeAll(async () => {
        root = kbnTestServer.createRoot(
          {
            plugins: { paths: [dummySecurityPlugin] },
          },
          {
            dev: true,
          }
        );

        const router = new Router('');
        router.get({ path: url.auth, validate: false }, async (req, res) =>
          res.ok({ content: 'ok' })
        );
        // TODO fix me when registerRouter is available before HTTP server is run
        (root as any).server.http.registerRouter(router);

        await root.setup();
      }, 30000);

      afterAll(async () => await root.shutdown());

      it('Should support implementing custom authentication logic', async () => {
        const response = await kbnTestServer.request
          .get(root, url.auth)
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
          .get(root, url.auth)
          .unset('Authorization')
          .expect(401);
      });

      it('Should support redirecting', async () => {
        await kbnTestServer.request.get(root, url.authRedirect).expect(302);
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
    });
  });
});
