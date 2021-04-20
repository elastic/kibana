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

import * as kbnTestServer from '../../../test_utils/kbn_server';

describe('Core app routes', () => {
  let root;

  beforeAll(async () => {
    root = kbnTestServer.createRoot({
      plugins: { initialize: false },
      server: {
        basePath: '/base-path',
      },
    });

    await root.start();
  }, 30000);

  afterAll(async function () {
    await root.shutdown();
  });

  describe('`/{path*}` route', () => {
    it('does not redirect if the path starts with `//`', async () => {
      await kbnTestServer.request.get(root, '//some-path/').expect(404);
    });

    it('does not redirect if the path does not end with `/`', async () => {
      await kbnTestServer.request.get(root, '/some-path').expect(404);
    });
  });

  describe('`/` route', () => {
    it('prevails on the `/{path*}` route', async () => {
      const response = await kbnTestServer.request.get(root, '/').expect(302);
      expect(response.get('location')).toEqual('/base-path/app/kibana');
    });
  });
});
