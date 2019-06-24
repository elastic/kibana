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
import { Router } from '../../http/';
import * as kbnTestServer from '../../../../test_utils/kbn_server';

describe('legacy service', () => {
  describe('http server', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeEach(() => {
      root = kbnTestServer.createRoot();
    }, 30000);

    afterEach(async () => await root.shutdown());

    it("handles http request in Legacy platform if New platform doesn't handle it", async () => {
      const rootUrl = '/route';
      const router = new Router(rootUrl);
      router.get({ path: '/new-platform', validate: false }, (req, res) =>
        res.ok({ content: 'from-new-platform' })
      );

      const { http } = await root.setup();
      http.registerRouter(router);
      await root.start();

      const legacyPlatformUrl = `${rootUrl}/legacy-platform`;
      const kbnServer = kbnTestServer.getKbnServer(root);
      kbnServer.server.route({
        method: 'GET',
        path: legacyPlatformUrl,
        handler: () => 'ok from legacy server',
      });

      await kbnTestServer.request
        .get(root, '/route/new-platform')
        .expect(200, { content: 'from-new-platform' });

      await kbnTestServer.request.get(root, legacyPlatformUrl).expect(200, 'ok from legacy server');
    });
    it('throws error if Legacy and New platforms register handler for the same route', async () => {
      const rootUrl = '/route';
      const router = new Router(rootUrl);
      router.get({ path: '', validate: false }, (req, res) =>
        res.ok({ content: 'from-new-platform' })
      );

      const { http } = await root.setup();
      http.registerRouter(router);
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
