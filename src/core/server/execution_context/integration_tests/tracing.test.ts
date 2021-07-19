/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContextContainer } from '../../../public/execution_context/execution_context_container';
import * as kbnTestServer from '../../../test_helpers/kbn_server';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parentContext = {
  type: 'test-type',
  name: 'test-name',
  id: '42',
  description: 'test-description',
};

describe('trace', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: ReturnType<typeof kbnTestServer.createRoot>;
  beforeAll(async () => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: jest.setTimeout,
    });
    esServer = await startES();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  beforeEach(async () => {
    root = kbnTestServer.createRootWithCorePlugins({
      plugins: { initialize: false },
      server: {
        requestId: {
          allowFromAnyIp: true,
        },
      },
    });
  }, 30000);

  afterEach(async () => {
    await root.shutdown();
  });

  describe('x-opaque-id', () => {
    it('passed to Elasticsearch unscoped client calls', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const myOpaqueId = 'my-opaque-id';
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', myOpaqueId)
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toBe(myOpaqueId);
    });

    it('passed to Elasticsearch scoped client calls', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const myOpaqueId = 'my-opaque-id';
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', myOpaqueId)
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toBe(myOpaqueId);
    });

    it('generated and attached to Elasticsearch unscoped client calls if not specifed', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toEqual(expect.any(String));
    });

    it('generated and attached to Elasticsearch scoped client calls if not specifed', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toEqual(expect.any(String));
    });

    it('can be overriden during Elasticsearch client call', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping(
          {},
          {
            opaqueId: 'new-opaque-id',
          }
        );
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const myOpaqueId = 'my-opaque-id';
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', myOpaqueId)
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toBe('new-opaque-id');
    });

    describe('ExecutionContext Service is disabled', () => {
      let rootExecutionContextDisabled: ReturnType<typeof kbnTestServer.createRoot>;
      beforeEach(async () => {
        rootExecutionContextDisabled = kbnTestServer.createRootWithCorePlugins({
          execution_context: { enabled: false },
          plugins: { initialize: false },
          server: {
            requestId: {
              allowFromAnyIp: true,
            },
          },
        });
      }, 30000);

      afterEach(async () => {
        await rootExecutionContextDisabled.shutdown();
      });
      it('passed to Elasticsearch scoped client calls even if ExecutionContext Service is disabled', async () => {
        const { http } = await rootExecutionContextDisabled.setup();
        const { createRouter } = http;

        const router = createRouter('');
        router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
          const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
          return res.ok({ body: headers || {} });
        });

        await rootExecutionContextDisabled.start();

        const myOpaqueId = 'my-opaque-id';
        const response = await kbnTestServer.request
          .get(rootExecutionContextDisabled, '/execution-context')
          .set('x-opaque-id', myOpaqueId)
          .expect(200);

        const header = response.body['x-opaque-id'];
        expect(header).toBe(myOpaqueId);
      });

      it('does not pass context if ExecutionContext Service is disabled', async () => {
        const { http, executionContext } = await rootExecutionContextDisabled.setup();
        const { createRouter } = http;

        const router = createRouter('');
        router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
          executionContext.set(parentContext);
          const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
          return res.ok({
            body: { context: executionContext.get()?.toJSON(), header: headers?.['x-opaque-id'] },
          });
        });

        await rootExecutionContextDisabled.start();

        const myOpaqueId = 'my-opaque-id';
        const response = await kbnTestServer.request
          .get(rootExecutionContextDisabled, '/execution-context')
          .set('x-opaque-id', myOpaqueId)
          .expect(200);

        expect(response.body).toEqual({
          header: 'my-opaque-id',
        });
      });
    });
  });

  describe('execution context', () => {
    it('sets execution context for a sync request handler', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        return res.ok({ body: executionContext.get() });
      });

      await root.start();
      const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);
      expect(response.body).toEqual({ ...parentContext, requestId: expect.any(String) });
    });

    it('sets execution context for an async request handler', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        await delay(100);
        return res.ok({ body: executionContext.get() });
      });

      await root.start();
      const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);
      expect(response.body).toEqual({ ...parentContext, requestId: expect.any(String) });
    });

    it('execution context is uniq for sequential requests', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        await delay(100);
        return res.ok({ body: executionContext.get() });
      });

      await root.start();
      const responseA = await kbnTestServer.request.get(root, '/execution-context').expect(200);
      const responseB = await kbnTestServer.request.get(root, '/execution-context').expect(200);

      expect(responseA.body).toEqual({ ...parentContext, requestId: expect.any(String) });
      expect(responseB.body).toEqual({ ...parentContext, requestId: expect.any(String) });
      expect(responseA.body.requestId).not.toBe(responseB.body.requestId);
    });

    it('execution context is uniq for concurrent requests', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      let id = 2;
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        await delay(id-- * 100);
        return res.ok({ body: executionContext.get() });
      });

      await root.start();
      const responseA = kbnTestServer.request.get(root, '/execution-context');
      const responseB = kbnTestServer.request.get(root, '/execution-context');
      const responseC = kbnTestServer.request.get(root, '/execution-context');

      const [{ body: bodyA }, { body: bodyB }, { body: bodyC }] = await Promise.all([
        responseA,
        responseB,
        responseC,
      ]);
      expect(bodyA.requestId).toBeDefined();
      expect(bodyB.requestId).toBeDefined();
      expect(bodyC.requestId).toBeDefined();

      expect(bodyA.requestId).not.toBe(bodyB.requestId);
      expect(bodyB.requestId).not.toBe(bodyC.requestId);
      expect(bodyA.requestId).not.toBe(bodyC.requestId);
    });

    it('execution context is uniq for concurrent requests when "x-opaque-id" provided', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      let id = 2;
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        await delay(id-- * 100);
        return res.ok({ body: executionContext.get() });
      });

      await root.start();
      const responseA = kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', 'req-1');
      const responseB = kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', 'req-2');
      const responseC = kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', 'req-3');

      const [{ body: bodyA }, { body: bodyB }, { body: bodyC }] = await Promise.all([
        responseA,
        responseB,
        responseC,
      ]);
      expect(bodyA.requestId).toBe('req-1');
      expect(bodyB.requestId).toBe('req-2');
      expect(bodyC.requestId).toBe('req-3');
    });

    it('parses the parent context if present', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, (context, req, res) =>
        res.ok({ body: executionContext.get() })
      );

      await root.start();
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set(new ExecutionContextContainer(parentContext).toHeader())
        .expect(200);

      expect(response.body).toEqual({ ...parentContext, requestId: expect.any(String) });
    });

    it('execution context is the same for all the lifecycle events', async () => {
      const { executionContext, http } = await root.setup();
      const {
        createRouter,
        registerOnPreRouting,
        registerOnPreAuth,
        registerAuth,
        registerOnPostAuth,
        registerOnPreResponse,
      } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        return res.ok({ body: executionContext.get()?.toJSON() });
      });

      let onPreRoutingContext;
      registerOnPreRouting((request, response, t) => {
        onPreRoutingContext = executionContext.get()?.toJSON();
        return t.next();
      });

      let onPreAuthContext;
      registerOnPreAuth((request, response, t) => {
        onPreAuthContext = executionContext.get()?.toJSON();
        return t.next();
      });

      let authContext;
      registerAuth((request, response, t) => {
        authContext = executionContext.get()?.toJSON();
        return t.authenticated();
      });

      let onPostAuthContext;
      registerOnPostAuth((request, response, t) => {
        onPostAuthContext = executionContext.get()?.toJSON();
        return t.next();
      });

      let onPreResponseContext;
      registerOnPreResponse((request, response, t) => {
        onPreResponseContext = executionContext.get()?.toJSON();
        return t.next();
      });

      await root.start();
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set(new ExecutionContextContainer(parentContext).toHeader())
        .expect(200);

      expect(response.body).toEqual({ ...parentContext, requestId: expect.any(String) });

      expect(response.body).toEqual(onPreRoutingContext);
      expect(response.body).toEqual(onPreAuthContext);
      expect(response.body).toEqual(authContext);
      expect(response.body).toEqual(onPostAuthContext);
      expect(response.body).toEqual(onPreResponseContext);
    });

    it('propagates context to Elasticsearch scoped client', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set(new ExecutionContextContainer(parentContext).toHeader())
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toContain('kibana:test-type:test-name:42');
    });

    it('propagates context to Elasticsearch unscoped client', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set(new ExecutionContextContainer(parentContext).toHeader())
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toContain('kibana:test-type:test-name:42');
    });

    it('a repeat call overwrites the old context', async () => {
      const { http, executionContext } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      const newContext = {
        type: 'new-type',
        name: 'new-name',
        id: '41',
        description: 'new-description',
      };
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(newContext);
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set(new ExecutionContextContainer(parentContext).toHeader())
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toContain('kibana:new-type:new-name:41');
    });

    it('does not affect "x-opaque-id" set by user', async () => {
      const { http, executionContext } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const myOpaqueId = 'my-opaque-id';
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', myOpaqueId)
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toBe('my-opaque-id;kibana:test-type:test-name:42');
    });

    it('does not break on non-ASCII characters within execution context', async () => {
      const { http, executionContext } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      const ctx = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'какое-то описание',
      };
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(ctx);
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping();
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const myOpaqueId = 'my-opaque-id';
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', myOpaqueId)
        .expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toBe('my-opaque-id;kibana:test-type:test-name:42');
    });
  });
});
