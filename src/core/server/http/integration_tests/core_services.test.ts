/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MockElasticsearchClient } from './core_service.test.mocks';
import { elasticsearchClientMock } from '../../elasticsearch/client/mocks';
import { errors } from '@elastic/elasticsearch';
import * as kbnTestServer from '../../../test_helpers/kbn_server';
import { InternalElasticsearchServiceStart } from '../../elasticsearch';

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
      root = kbnTestServer.createRoot({
        plugins: { initialize: false },
        elasticsearch: { skipStartupConnectionCheck: true },
      });
      await root.preboot();
    }, 30000);

    afterEach(async () => {
      await root.shutdown();
    });
    describe('#isAuthenticated()', () => {
      it('returns true if has been authenticated', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.authenticated());

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
        registerAuth(authenticate);
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

  describe('elasticsearch client', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;

    beforeEach(async () => {
      root = kbnTestServer.createRoot({
        plugins: { initialize: false },
        elasticsearch: { skipStartupConnectionCheck: true },
      });
      await root.preboot();
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
          new errors.ResponseError({
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
          new errors.ResponseError({
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

    it('provides error reason for Elasticsearch Response Errors', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;
      // eslint-disable-next-line prefer-const
      let elasticsearch: InternalElasticsearchServiceStart;

      esClient.ping.mockImplementation(() =>
        elasticsearchClientMock.createErrorTransportRequestPromise(
          new errors.ResponseError({
            statusCode: 404,
            body: {
              error: {
                type: 'error_type',
                reason: 'error_reason',
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
        try {
          const result = await elasticsearch.client
            .asScoped(req)
            .asInternalUser.ping({}, { meta: true });
          return res.ok({
            body: result,
          });
        } catch (e) {
          return res.badRequest({
            body: e,
          });
        }
      });

      const coreStart = await root.start();
      elasticsearch = coreStart.elasticsearch;

      const { body } = await kbnTestServer.request.get(root, '/new-platform/').expect(400);

      expect(body.message).toMatch('[error_type]: error_reason');
    });
  });
});
