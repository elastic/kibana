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
import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { Root } from '../../root';

describe('Platform assets', function () {
  let root: Root;

  beforeAll(async function () {
    root = kbnTestServer.createRoot({ plugins: { initialize: false } });

    await root.setup();
    await root.start();
  });

  afterAll(async function () {
    await root.shutdown();
  });

  it('exposes static assets', async () => {
    await kbnTestServer.request.get(root, '/ui/favicons/favicon.ico').expect(200);
  });

  it('returns 404 if not found', async function () {
    await kbnTestServer.request.get(root, '/ui/favicons/not-a-favicon.ico').expect(404);
  });

  it('does not expose folder content', async function () {
    await kbnTestServer.request.get(root, '/ui/favicons/').expect(403);
  });

  it('does not allow file tree traversing', async function () {
    await kbnTestServer.request.get(root, '/ui/../../../../../README.md').expect(404);
  });
});
