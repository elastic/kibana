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

import {
  MockLegacyScopedClusterClient,
  MockElasticsearchClient,
  legacyClusterClientInstanceMock,
} from './core_service.test.mocks';

import Boom from 'boom';
import { Request } from 'hapi';
import { errors as esErrors } from 'elasticsearch';
import { LegacyElasticsearchErrorHelpers } from '../../elasticsearch/legacy';

import { elasticsearchClientMock } from '../../elasticsearch/client/mocks';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { InternalElasticsearchServiceStart } from '../../elasticsearch';

interface User {
  id: string;
  roles?: string[];
}

interface StorageData {
  value: User;
  expires: number;
}

const cookieOptions = {
  name: 'sid',
  encryptionKey: 'something_at_least_32_characters',
  validate: () => ({ isValid: true }),
  isSecure: false,
};

describe('http service', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;

  beforeEach(async () => {
    esClient = elasticsearchClientMock.createInternalClient();
    MockElasticsearchClient.mockImplementation(() => esClient);
  }, 30000);

  afterEach(async () => {
    MockElasticsearchClient.mockClear();
  });

  describe('auth', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeEach(async () => {
      root = kbnTestServer.createRoot({ plugins: { initialize: false } });
    }, 30000);

    afterEach(async () => {
      await root.shutdown();
    });
    describe('#isAuthenticated()', () => {
      it('returns true if has been authenticated', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        await registerAuth((req, res, toolkit) => toolkit.authenticated());

        const router = createRouter('');
        router.get({ path: '/is-auth', validate: false }, (context, req, res) =>
          res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
        );

        await root.start();
        await kbnTestServer.request.get(root, '/is-auth').expect(200, { isAuthenticated: true });
      });

      it('returns false if has not been authenticated', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.authenticated());

        const router = createRouter('');
        router.get(
          { path: '/is-auth', validate: false, options: { authRequired: false } },
          (context, req, res) => res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
        );

        await root.start();
        await kbnTestServer.request.get(root, '/is-auth').expect(200, { isAuthenticated: false });
      });

      it('returns false if no authentication mechanism has been registered', async () => {
        const { http } = await root.setup();
        const { createRouter, auth } = http;

        const router = createRouter('');
        router.get(
          { path: '/is-auth', validate: false, options: { authRequired: false } },
          (context, req, res) => res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
        );

        await root.start();
        await kbnTestServer.request.get(root, '/is-auth').expect(200, { isAuthenticated: false });
      });

      it('returns true if authenticated on a route with "optional" auth', async () => {
        const { http } = await root.setup();
        const { createRouter, auth, registerAuth } = http;

        registerAuth((req, res, toolkit) => toolkit.authenticated());
        const router = createRouter('');
        router.get(
          { path: '/is-auth', validate: false, options: { authRequired: 'optional' } },
          (context, req, res) => res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
        );

        await root.start();
        await kbnTestServer.request.get(root, '/is-auth').expect(200, { isAuthenticated: true });
      });

      it('returns false if not authenticated on a route with "optional" auth', async () => {
        const { http } = await root.setup();
        const { createRouter, auth, registerAuth } = http;

        registerAuth((req, res, toolkit) => toolkit.notHandled());

        const router = createRouter('');
        router.get(
          { path: '/is-auth', validate: false, options: { authRequired: 'optional' } },
          (context, req, res) => res.ok({ body: { isAuthenticated: auth.isAuthenticated(req) } })
        );

        await root.start();
        await kbnTestServer.request.get(root, '/is-auth').expect(200, { isAuthenticated: false });
      });
    });
    describe('#get()', () => {
      it('returns authenticated status and allow associate auth state with request', async () => {
        const user = { id: '42' };

        const { http } = await root.setup();
        const { createCookieSessionStorageFactory, createRouter, registerAuth, auth } = http;
        const sessionStorageFactory = await createCookieSessionStorageFactory(cookieOptions);
        registerAuth((req, res, toolkit) => {
          sessionStorageFactory.asScoped(req).set({ value: user });
          return toolkit.authenticated({ state: user });
        });

        const router = createRouter('');
        router.get({ path: '/get-auth', validate: false }, (context, req, res) =>
          res.ok({ body: auth.get<{ id: string }>(req) })
        );

        await root.start();

        await kbnTestServer.request
          .get(root, '/get-auth')
          .expect(200, { state: user, status: 'authenticated' });
      });

      it('returns correct authentication unknown status', async () => {
        const { http } = await root.setup();
        const { createRouter, auth } = http;

        const router = createRouter('');
        router.get({ path: '/get-auth', validate: false }, (context, req, res) =>
          res.ok({ body: auth.get(req) })
        );

        await root.start();
        await kbnTestServer.request.get(root, '/get-auth').expect(200, { status: 'unknown' });
      });

      it('returns correct unauthenticated status', async () => {
        const authenticate = jest.fn();

        const { http } = await root.setup();
        const { createRouter, registerAuth, auth } = http;
        await registerAuth(authenticate);
        const router = createRouter('');
        router.get(
          { path: '/get-auth', validate: false, options: { authRequired: false } },
          (context, req, res) => res.ok({ body: auth.get(req) })
        );

        await root.start();

        await kbnTestServer.request
          .get(root, '/get-auth')
          .expect(200, { status: 'unauthenticated' });

        expect(authenticate).not.toHaveBeenCalled();
      });
    });
  });

  describe('legacy server', () => {
    describe('#registerAuth()', () => {
      const sessionDurationMs = 1000;

      let root: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        root = kbnTestServer.createRoot({ plugins: { initialize: false } });
      }, 30000);

      afterEach(async () => {
        MockLegacyScopedClusterClient.mockClear();
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
        root = kbnTestServer.createRoot({ plugins: { initialize: false } });
      }, 30000);

      afterEach(async () => await root.shutdown());
      it('basePath information for an incoming request is available in legacy server', async () => {
        const reqBasePath = '/requests-specific-base-path';
        const { http } = await root.setup();
        http.registerOnPreRouting((req, res, toolkit) => {
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
  describe('legacy elasticsearch client', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeEach(async () => {
      root = kbnTestServer.createRoot({ plugins: { initialize: false } });
    }, 30000);

    afterEach(async () => {
      MockLegacyScopedClusterClient.mockClear();
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
        await context.core.elasticsearch.legacy.client.callAsCurrentUser('ping');
        return res.ok();
      });

      await root.start();

      await kbnTestServer.request.get(root, '/new-platform/').expect(200);

      // client contains authHeaders for BWC with legacy platform.
      const [client] = MockLegacyScopedClusterClient.mock.calls;
      const [, , clientHeaders] = client;
      expect(clientHeaders).toEqual({
        ...authHeaders,
        'x-opaque-id': expect.any(String),
      });
    });

    it('passes request authorization header to Elasticsearch if registerAuth was not set', async () => {
      const authorizationHeader = 'Basic: username:password';
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('/new-platform');
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        // it forces client initialization since the core creates them lazily.
        await context.core.elasticsearch.legacy.client.callAsCurrentUser('ping');
        return res.ok();
      });

      await root.start();

      await kbnTestServer.request
        .get(root, '/new-platform/')
        .set('Authorization', authorizationHeader)
        .expect(200);

      const [client] = MockLegacyScopedClusterClient.mock.calls;
      const [, , clientHeaders] = client;
      expect(clientHeaders).toEqual({
        authorization: authorizationHeader,
        'x-opaque-id': expect.any(String),
      });
    });

    it('forwards 401 errors returned from elasticsearch', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const authenticationError = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (esErrors.AuthenticationException as any)('Authentication Exception', {
          body: { error: { header: { 'WWW-Authenticate': 'authenticate header' } } },
          statusCode: 401,
        })
      );

      legacyClusterClientInstanceMock.callAsCurrentUser.mockRejectedValue(authenticationError);

      const router = createRouter('/new-platform');
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        await context.core.elasticsearch.legacy.client.callAsCurrentUser('ping');
        return res.ok();
      });

      await root.start();

      const response = await kbnTestServer.request.get(root, '/new-platform/').expect(401);

      expect(response.header['www-authenticate']).toEqual('authenticate header');
    });
  });

  describe('elasticsearch client', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;

    beforeEach(async () => {
      root = kbnTestServer.createRoot({ plugins: { initialize: false } });
    }, 30000);

    afterEach(async () => {
      MockElasticsearchClient.mockClear();
      await root.shutdown();
    });

    it('forwards unauthorized errors from elasticsearch', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;
      // eslint-disable-next-line prefer-const
      let elasticsearch: InternalElasticsearchServiceStart;

      esClient.ping.mockImplementation(() =>
        elasticsearchClientMock.createErrorTransportRequestPromise(
          new ResponseError({
            statusCode: 401,
            body: {
              error: {
                type: 'Unauthorized',
              },
            },
            warnings: [],
            headers: {
              'WWW-Authenticate': 'content',
            },
            meta: {} as any,
          })
        )
      );

      const router = createRouter('/new-platform');
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        await elasticsearch.client.asScoped(req).asInternalUser.ping();
        return res.ok();
      });

      const coreStart = await root.start();
      elasticsearch = coreStart.elasticsearch;

      const { header } = await kbnTestServer.request.get(root, '/new-platform/').expect(401);

      expect(header['www-authenticate']).toEqual('content');
    });

    it('uses a default value for `www-authenticate` header when ES 401 does not specify it', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;
      // eslint-disable-next-line prefer-const
      let elasticsearch: InternalElasticsearchServiceStart;

      esClient.ping.mockImplementation(() =>
        elasticsearchClientMock.createErrorTransportRequestPromise(
          new ResponseError({
            statusCode: 401,
            body: {
              error: {
                type: 'Unauthorized',
              },
            },
            warnings: [],
            headers: {},
            meta: {} as any,
          })
        )
      );

      const router = createRouter('/new-platform');
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        await elasticsearch.client.asScoped(req).asInternalUser.ping();
        return res.ok();
      });

      const coreStart = await root.start();
      elasticsearch = coreStart.elasticsearch;

      const { header } = await kbnTestServer.request.get(root, '/new-platform/').expect(401);

      expect(header['www-authenticate']).toEqual('Basic realm="Authorization Required"');
    });
  });
});
