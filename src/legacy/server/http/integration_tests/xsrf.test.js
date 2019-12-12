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

const destructiveMethods = ['POST', 'PUT', 'DELETE'];
const src = resolve.bind(null, __dirname, '../../../../../src');

const xsrfHeader = 'kbn-xsrf';
const versionHeader = 'kbn-version';
const testPath = '/xsrf/test/route';
const whitelistedTestPath = '/xsrf/test/route/whitelisted';
const actualVersion = require(src('../package.json')).version; // eslint-disable-line import/no-dynamic-require

describe('xsrf request filter', () => {
  let root;
  beforeAll(async () => {
    root = kbnTestServer.createRoot({
      server: {
        xsrf: { disableProtection: false, whitelist: [whitelistedTestPath] },
      },
    });

    await root.setup();
    await root.start();

    const kbnServer = kbnTestServer.getKbnServer(root);
    kbnServer.server.route({
      path: testPath,
      method: 'GET',
      handler: async function() {
        return 'ok';
      },
    });

    kbnServer.server.route({
      path: testPath,
      method: destructiveMethods,
      config: {
        // Disable payload parsing to make HapiJS server accept any content-type header.
        payload: {
          parse: false,
        },
        validate: { payload: null },
      },
      handler: async function() {
        return 'ok';
      },
    });

    kbnServer.server.route({
      path: whitelistedTestPath,
      method: destructiveMethods,
      config: {
        // Disable payload parsing to make HapiJS server accept any content-type header.
        payload: {
          parse: false,
        },
        validate: { payload: null },
      },
      handler: async function() {
        return 'ok';
      },
    });
  }, 30000);

  afterAll(async () => await root.shutdown());

  describe(`nonDestructiveMethod: GET`, function() {
    it('accepts requests without a token', async function() {
      await kbnTestServer.request.get(root, testPath).expect(200, 'ok');
    });

    it('accepts requests with the xsrf header', async function() {
      await kbnTestServer.request
        .get(root, testPath)
        .set(xsrfHeader, 'anything')
        .expect(200, 'ok');
    });
  });

  describe(`nonDestructiveMethod: HEAD`, function() {
    it('accepts requests without a token', async function() {
      await kbnTestServer.request.head(root, testPath).expect(200, undefined);
    });

    it('accepts requests with the xsrf header', async function() {
      await kbnTestServer.request
        .head(root, testPath)
        .set(xsrfHeader, 'anything')
        .expect(200, undefined);
    });
  });

  for (const method of destructiveMethods) {
    // eslint-disable-next-line no-loop-func
    describe(`destructiveMethod: ${method}`, function() {
      it('accepts requests with the xsrf header', async function() {
        await kbnTestServer.request[method.toLowerCase()](root, testPath)
          .set(xsrfHeader, 'anything')
          .expect(200, 'ok');
      });

      // this is still valid for existing csrf protection support
      // it does not actually do any validation on the version value itself
      it('accepts requests with the version header', async function() {
        await kbnTestServer.request[method.toLowerCase()](root, testPath)
          .set(versionHeader, actualVersion)
          .expect(200, 'ok');
      });

      it('rejects requests without either an xsrf or version header', async function() {
        await kbnTestServer.request[method.toLowerCase()](root, testPath).expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Request must contain a kbn-xsrf header.',
        });
      });

      it('accepts whitelisted requests without either an xsrf or version header', async function() {
        await kbnTestServer.request[method.toLowerCase()](root, whitelistedTestPath).expect(
          200,
          'ok'
        );
      });
    });
  }
});
