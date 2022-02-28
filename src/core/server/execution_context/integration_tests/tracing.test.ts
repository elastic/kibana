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

const withUtf8CharsContext = {
  type: 'test字type',
  name: 'test漢字name',
  id: '9000☺',
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
      execution_context: {
        enabled: true,
      },
    });
    await root.preboot();
  }, 60000);

  afterEach(async () => {
    await root.shutdown();
  });

  describe('x-opaque-id', () => {
    it('passed to Elasticsearch unscoped client calls', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping(
          {},
          { meta: true }
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
      expect(header).toBe(myOpaqueId);
    });

    it('passed to Elasticsearch scoped client calls', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
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
      expect(header).toBe(myOpaqueId);
    });

    it('generated and attached to Elasticsearch unscoped client calls if not specifed', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping(
          {},
          { meta: true }
        );
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
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
        );
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toEqual(expect.any(String));
    });

    it('can be overridden during Elasticsearch client call', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping(
          {},
          {
            opaqueId: 'new-opaque-id',
            meta: true,
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
        await rootExecutionContextDisabled.preboot();
      }, 30000);

      afterEach(async () => {
        await rootExecutionContextDisabled.shutdown();
      });
      it('passed to Elasticsearch scoped client calls even if ExecutionContext Service is disabled', async () => {
        const { http } = await rootExecutionContextDisabled.setup();
        const { createRouter } = http;

        const router = createRouter('');
        router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
          const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
            {},
            { meta: true }
          );
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
          const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
            {},
            { meta: true }
          );
          return res.ok({
            body: {
              context: executionContext.get()?.toJSON(),
              header: headers?.['x-opaque-id'],
            },
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
      expect(response.body).toEqual(parentContext);
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
      expect(response.body).toEqual(parentContext);
    });

    it('execution context is uniq for sequential requests', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      let id = 42;
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set({ ...parentContext, id: String(id++) });
        await delay(100);
        return res.ok({ body: executionContext.get() });
      });

      await root.start();
      const responseA = await kbnTestServer.request.get(root, '/execution-context').expect(200);
      const responseB = await kbnTestServer.request.get(root, '/execution-context').expect(200);

      expect(responseA.body).toEqual({ ...parentContext, id: '42' });
      expect(responseB.body).toEqual({ ...parentContext, id: '43' });
    });

    it('execution context is uniq for concurrent requests', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      let id = 2;
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set({ ...parentContext, id: String(id) });
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

      expect(bodyA.id).toBe('2');
      expect(bodyB.id).toBe('1');
      expect(bodyC.id).toBe('0');
    });

    it('execution context is uniq for concurrent requests when "x-opaque-id" provided', async () => {
      const { executionContext, http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      let id = 2;
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        await delay(id-- * 100);
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
        );
        return res.ok({ body: headers || {} });
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
      expect(bodyA['x-opaque-id']).toContain('req-1');
      expect(bodyB['x-opaque-id']).toContain('req-2');
      expect(bodyC['x-opaque-id']).toContain('req-3');
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

      expect(response.body).toEqual(parentContext);
    });

    it('supports UTF-8 characters', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
        );
        return res.ok({ body: headers || {} });
      });

      await root.start();
      const response = await kbnTestServer.request
        .get(root, '/execution-context')
        .set('x-opaque-id', 'utf-test')
        .set(new ExecutionContextContainer(withUtf8CharsContext).toHeader())
        .expect(200);

      const rawOpaqueId = response.body['x-opaque-id'];
      expect(rawOpaqueId).toEqual(
        'utf-test;kibana:test%E5%AD%97type:test%E6%BC%A2%E5%AD%97name:9000%E2%98%BA'
      );
      expect(decodeURIComponent(rawOpaqueId)).toEqual(
        'utf-test;kibana:test字type:test漢字name:9000☺'
      );
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

      expect(response.body).toEqual(parentContext);

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
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
        );
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
        const { headers } = await context.core.elasticsearch.client.asInternalUser.ping(
          {},
          { meta: true }
        );
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

    it('passes "x-opaque-id" if no execution context is registered', async () => {
      const { http } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
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
      expect(header).toBe(myOpaqueId);
    });

    it('does not affect "x-opaque-id" set by user', async () => {
      const { http, executionContext } = await root.setup();
      const { createRouter } = http;

      const router = createRouter('');
      router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
        executionContext.set(parentContext);
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
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
        const { headers } = await context.core.elasticsearch.client.asCurrentUser.ping(
          {},
          { meta: true }
        );
        return res.ok({ body: headers || {} });
      });

      await root.start();

      const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);

      const header = response.body['x-opaque-id'];
      expect(header).toContain('kibana:test-type:test-name:42');
    });

    describe('withContext', () => {
      it('sets execution context for a nested function', async () => {
        const { executionContext, http } = await root.setup();
        const { createRouter } = http;

        const router = createRouter('');
        router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
          return executionContext.withContext(parentContext, () =>
            res.ok({ body: executionContext.get() })
          );
        });

        await root.start();
        const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);
        expect(response.body).toEqual(parentContext);
      });

      it('set execution context becomes child if parent context is presented', async () => {
        const { executionContext, http } = await root.setup();
        const { createRouter } = http;

        const router = createRouter('');
        const nestedContext = {
          type: 'nested-type',
          name: 'nested-name',
          id: '43',
          description: 'nested-description',
        };
        router.get({ path: '/execution-context', validate: false }, async (context, req, res) => {
          return executionContext.withContext(parentContext, async () => {
            await delay(100);
            return executionContext.withContext(nestedContext, async () => {
              await delay(100);
              return res.ok({ body: executionContext.get() });
            });
          });
        });

        await root.start();
        const response = await kbnTestServer.request.get(root, '/execution-context').expect(200);
        expect(response.body).toEqual({ child: nestedContext, ...parentContext });
      });

      it('extends the execution context passed from the client-side', async () => {
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
          const { headers } = await executionContext.withContext(newContext, () =>
            context.core.elasticsearch.client.asCurrentUser.ping({}, { meta: true })
          );
          return res.ok({ body: headers || {} });
        });

        await root.start();

        const response = await kbnTestServer.request
          .get(root, '/execution-context')
          .set(new ExecutionContextContainer(parentContext).toHeader())
          .expect(200);

        const header = response.body['x-opaque-id'];
        expect(header).toContain('kibana:test-type:test-name:42;new-type:new-name:41');
      });
    });
  });
});
