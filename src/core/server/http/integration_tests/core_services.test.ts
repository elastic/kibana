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
import { clusterClientMock } from './core_service.test.mocks';

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
  describe('legacy server', () => {
    describe('#registerAuth()', () => {
      const sessionDurationMs = 1000;
      const cookieOptions = {
        name: 'sid',
        encryptionKey: 'something_at_least_32_characters',
        validate: () => ({ isValid: true }),
        isSecure: false,
        path: '/',
      };

      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot({ migrations: { skip: true } });
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
        http.registerAuth((req, res, toolkit) => {
          if (req.headers.authorization) {
            const user = { id: '42' };
            const sessionStorage = sessionStorageFactory.asScoped(req);
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return toolkit.authenticated({ state: user });
          } else {
            return res.unauthorized();
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
        http.registerAuth((req, res, toolkit) => {
          if (req.headers.authorization) {
            const user = { id: '42' };
            const sessionStorage = sessionStorageFactory.asScoped(req);
            sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
            return toolkit.authenticated({
              state: user,
              requestHeaders: {
                authorization: token,
              },
            });
          } else {
            return res.unauthorized();
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

      it('attach security header to a successful response handled by Legacy platform', async () => {
        const authResponseHeader = {
          'www-authenticate': 'Negotiate ade0234568a4209af8bc0280289eca',
        };
        const { http } = await root.setup();
        const { registerAuth } = http;

        registerAuth((req, res, toolkit) => {
          return toolkit.authenticated({ responseHeaders: authResponseHeader });
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

        registerAuth((req, res, toolkit) => {
          return toolkit.authenticated({ responseHeaders: authResponseHeader });
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

    describe('#basePath()', () => {
      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot({ migrations: { skip: true } });
      }, 30000);

      afterEach(async () => await root.shutdown());
      it('basePath information for an incoming request is available in legacy server', async () => {
        const reqBasePath = '/requests-specific-base-path';
        const { http } = await root.setup();
        http.registerOnPreAuth((req, res, toolkit) => {
          http.basePath.set(req, reqBasePath);
          return toolkit.next();
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
  describe('elasticsearch', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeEach(async () => {
      root = kbnTestServer.createRoot({ migrations: { skip: true } });
    }, 30000);

    afterEach(async () => {
      clusterClientMock.mockClear();
      await root.shutdown();
    });

    it('rewrites authorization header via authHeaders to make a request to Elasticsearch', async () => {
      const authHeaders = { authorization: 'Basic: user:password' };
      const { http } = await root.setup();
      const { registerAuth, createRouter } = http;

      registerAuth((req, res, toolkit) => toolkit.authenticated({ requestHeaders: authHeaders }));

      const router = createRouter('/new-platform');
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        // it forces client initialization since the core creates them lazily.
        await context.core.elasticsearch.adminClient.callAsCurrentUser('ping');
        await context.core.elasticsearch.dataClient.callAsCurrentUser('ping');
        return res.ok();
      });

      await root.start();

      await kbnTestServer.request.get(root, '/new-platform/').expect(200);

      // admin client contains authHeaders for BWC with legacy platform.
      const [adminClient, dataClient] = clusterClientMock.mock.calls;
      const [, , adminClientHeaders] = adminClient;
      expect(adminClientHeaders).toEqual(authHeaders);
      const [, , dataClientHeaders] = dataClient;
      expect(dataClientHeaders).toEqual(authHeaders);
    });

    it('passes request authorization header to Elasticsearch if registerAuth was not set', async () => {
      const authorizationHeader = 'Basic: username:password';
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('/new-platform');
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        // it forces client initialization since the core creates them lazily.
        await context.core.elasticsearch.adminClient.callAsCurrentUser('ping');
        await context.core.elasticsearch.dataClient.callAsCurrentUser('ping');
        return res.ok();
      });

      await root.start();

      await kbnTestServer.request
        .get(root, '/new-platform/')
        .set('Authorization', authorizationHeader)
        .expect(200);

      const [adminClient, dataClient] = clusterClientMock.mock.calls;
      const [, , adminClientHeaders] = adminClient;
      expect(adminClientHeaders).toEqual({ authorization: authorizationHeader });
      const [, , dataClientHeaders] = dataClient;
      expect(dataClientHeaders).toEqual({ authorization: authorizationHeader });
    });
  });
});
