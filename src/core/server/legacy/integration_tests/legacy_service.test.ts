/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as kbnTestServer from '../../../test_helpers/kbn_server';

describe('legacy service', () => {
  describe('http server', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeEach(() => {
      root = kbnTestServer.createRoot({
        migrations: { skip: true },
        plugins: { initialize: false },
      });
    }, 30000);

    afterEach(async () => await root.shutdown());

    it("handles http request in Legacy platform if New platform doesn't handle it", async () => {
      const { http } = await root.setup();
      const rootUrl = '/route';
      const router = http.createRouter(rootUrl);
      router.get({ path: '/new-platform', validate: false }, (context, req, res) =>
        res.ok({ body: 'from-new-platform' })
      );

      await root.start();

      const legacyPlatformUrl = `${rootUrl}/legacy-platform`;
      const kbnServer = kbnTestServer.getKbnServer(root);
      kbnServer.server.route({
        method: 'GET',
        path: legacyPlatformUrl,
        handler: () => 'ok from legacy server',
      });

      await kbnTestServer.request.get(root, '/route/new-platform').expect(200, 'from-new-platform');

      await kbnTestServer.request.get(root, legacyPlatformUrl).expect(200, 'ok from legacy server');
    });
    it('throws error if Legacy and New platforms register handler for the same route', async () => {
      const { http } = await root.setup();
      const rootUrl = '/route';
      const router = http.createRouter(rootUrl);
      router.get({ path: '', validate: false }, (context, req, res) =>
        res.ok({ body: 'from-new-platform' })
      );

      await root.start();

      const kbnServer = kbnTestServer.getKbnServer(root);
      expect(() =>
        kbnServer.server.route({
          method: 'GET',
          path: rootUrl,
          handler: () => 'ok from legacy server',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"New route /route conflicts with existing /route"`);
    });
  });
});
