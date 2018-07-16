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

import { fromNode } from 'bluebird';
import { resolve } from 'path';
import * as kbnTestServer from '../../test_utils/kbn_server';

const src = resolve.bind(null, __dirname, '../../../src');

const versionHeader = 'kbn-version';
const version = require(src('../package.json')).version;

describe('version_check request filter', function () {
  function makeRequest(kbnServer, opts) {
    return fromNode(cb => {
      kbnTestServer.makeRequest(kbnServer, opts, (resp) => {
        cb(null, resp);
      });
    });
  }

  async function makeServer() {
    const kbnServer = kbnTestServer.createServer();

    await kbnServer.ready();

    kbnServer.server.route({
      path: '/version_check/test/route',
      method: 'GET',
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    return kbnServer;
  }

  let kbnServer;
  beforeEach(async () => kbnServer = await makeServer());
  afterEach(async () => await kbnServer.close());

  it('accepts requests with the correct version passed in the version header', async function () {
    const resp = await makeRequest(kbnServer, {
      url: '/version_check/test/route',
      method: 'GET',
      headers: {
        [versionHeader]: version,
      },
    });

    expect(resp.statusCode).toBe(200);
    expect(resp.payload).toBe('ok');
  });

  it('rejects requests with an incorrect version passed in the version header', async function () {
    const resp = await makeRequest(kbnServer, {
      url: '/version_check/test/route',
      method: 'GET',
      headers: {
        [versionHeader]: `invalid:${version}`,
      },
    });

    expect(resp.statusCode).toBe(400);
    expect(resp.headers).toHaveProperty(versionHeader, version);
    expect(resp.payload).toMatch(/"Browser client is out of date/);
  });

  it('accepts requests that do not include a version header', async function () {
    const resp = await makeRequest(kbnServer, {
      url: '/version_check/test/route',
      method: 'GET'
    });

    expect(resp.statusCode).toBe(200);
    expect(resp.payload).toBe('ok');
  });
});
