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

import { resolve } from 'path';
import * as kbnTestServer from '../../../../test_utils/kbn_server';

const src = resolve.bind(null, __dirname, '../../../../../src');

const versionHeader = 'kbn-version';
const version = require(src('../package.json')).version; // eslint-disable-line import/no-dynamic-require

describe('version_check request filter', function() {
  let root;
  beforeAll(async () => {
    root = kbnTestServer.createRoot();

    await root.setup();
    await root.start();

    kbnTestServer.getKbnServer(root).server.route({
      path: '/version_check/test/route',
      method: 'GET',
      handler: function() {
        return 'ok';
      },
    });
  }, 30000);

  afterAll(async () => await root.shutdown());

  it('accepts requests with the correct version passed in the version header', async function() {
    await kbnTestServer.request
      .get(root, '/version_check/test/route')
      .set(versionHeader, version)
      .expect(200, 'ok');
  });

  it('rejects requests with an incorrect version passed in the version header', async function() {
    await kbnTestServer.request
      .get(root, '/version_check/test/route')
      .set(versionHeader, `invalid:${version}`)
      .expect(400, /"Browser client is out of date/);
  });

  it('accepts requests that do not include a version header', async function() {
    await kbnTestServer.request.get(root, '/version_check/test/route').expect(200, 'ok');
  });
});
