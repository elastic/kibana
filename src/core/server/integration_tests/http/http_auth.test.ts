/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, RouteConfigOptions, HttpAuth } from '@kbn/core-http-server';
import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('http auth', () => {
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    root = createRoot({
      plugins: { initialize: false },
      elasticsearch: { skipStartupConnectionCheck: true },
    });
    await root.preboot();
  });

  afterEach(async () => {
    await root.shutdown();
  });

  const registerRoute = (
    router: IRouter,
    auth: HttpAuth,
    authRequired: RouteConfigOptions<'get'>['authRequired']
  ) => {
    router.get(
      {
        path: '/route',
        validate: false,
        options: {
          authRequired,
        },
      },
      (context, req, res) => res.ok({ body: { authenticated: auth.isAuthenticated(req) } })
    );
  };

  describe('when auth is registered', () => {
    describe('when authRequired is `true`', () => {
      it('allows authenticated access when auth returns `authenticated`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.authenticated());

        const router = createRouter('');
        registerRoute(router, auth, true);

        await root.start();
        await request.get(root, '/route').expect(200, { authenticated: true });
      });

      it('blocks access when auth returns `notHandled`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.notHandled());

        const router = createRouter('');
        registerRoute(router, auth, true);

        await root.start();
        await request.get(root, '/route').expect(401);
      });

      it('blocks access when auth returns `unauthorized`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => res.unauthorized());

        const router = createRouter('');
        registerRoute(router, auth, true);

        await root.start();
        await request.get(root, '/route').expect(401);
      });
    });
    describe('when authRequired is `false`', () => {
      it('allows anonymous access when auth returns `authenticated`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.authenticated());

        const router = createRouter('');
        registerRoute(router, auth, false);

        await root.start();
        await request.get(root, '/route').expect(200, { authenticated: false });
      });

      it('allows anonymous access when auth returns `notHandled`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.notHandled());

        const router = createRouter('');
        registerRoute(router, auth, false);

        await root.start();
        await request.get(root, '/route').expect(200, { authenticated: false });
      });

      it('allows anonymous access when auth returns `unauthorized`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => res.unauthorized());

        const router = createRouter('');
        registerRoute(router, auth, false);

        await root.start();
        await request.get(root, '/route').expect(200, { authenticated: false });
      });
    });
    describe('when authRequired is `optional`', () => {
      it('allows authenticated access when auth returns `authenticated`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.authenticated());

        const router = createRouter('');
        registerRoute(router, auth, 'optional');

        await root.start();
        await request.get(root, '/route').expect(200, { authenticated: true });
      });

      it('allows anonymous access when auth returns `notHandled`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => toolkit.notHandled());

        const router = createRouter('');
        registerRoute(router, auth, 'optional');

        await root.start();
        await request.get(root, '/route').expect(200, { authenticated: false });
      });

      it('allows anonymous access when auth returns `unauthorized`', async () => {
        const { http } = await root.setup();
        const { registerAuth, createRouter, auth } = http;

        registerAuth((req, res, toolkit) => res.unauthorized());

        const router = createRouter('');
        registerRoute(router, auth, 'optional');

        await root.start();
        await request.get(root, '/route').expect(200, { authenticated: false });
      });
    });
  });

  describe('when auth is not registered', () => {
    it('allow anonymous access to resources when `authRequired` is `true`', async () => {
      const { http } = await root.setup();
      const { createRouter, auth } = http;

      const router = createRouter('');
      registerRoute(router, auth, true);

      await root.start();
      await request.get(root, '/route').expect(200, { authenticated: false });
    });

    it('allow anonymous access to resources when `authRequired` is `false`', async () => {
      const { http } = await root.setup();
      const { createRouter, auth } = http;

      const router = createRouter('');
      registerRoute(router, auth, false);

      await root.start();
      await request.get(root, '/route').expect(200, { authenticated: false });
    });

    it('allow anonymous access to resources when `authRequired` is `optional`', async () => {
      const { http } = await root.setup();
      const { createRouter, auth } = http;

      const router = createRouter('');
      registerRoute(router, auth, 'optional');

      await root.start();
      await request.get(root, '/route').expect(200, { authenticated: false });
    });
  });
});
