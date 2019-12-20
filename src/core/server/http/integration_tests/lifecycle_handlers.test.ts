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
import { clusterClientMock } from './core_service.test.mocks';

const pkgPath = resolve(__dirname, '../../../../../package.json');
const actualVersion = require(pkgPath).version;

const versionHeader = 'kbn-version';
const xsrfHeader = 'kbn-xsrf';
const nameHeader = 'kbn-name';

const whitelistedTestPath = '/xsrf/test/route/whitelisted';

const kibanaName = 'my-kibana-name';

describe('core lifecycle handlers', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;

  beforeEach(async () => {
    root = kbnTestServer.createRoot({
      server: {
        name: kibanaName,
        customResponseHeaders: {
          'some-header': 'some-value',
        },
        xsrf: { disableProtection: false, whitelist: [whitelistedTestPath] },
      },
    });
    await root.setup();
    await root.start();
  }, 30000);

  afterEach(async () => {
    clusterClientMock.mockClear();
    await root.shutdown();
  });

  describe('versionCheck post-auth handler', () => {
    const testRoute = '/version_check/test/route';

    beforeEach(() => {
      kbnTestServer.getKbnServer(root).server.route({
        path: testRoute,
        method: 'GET',
        handler: () => 'ok',
      });
    });

    it('accepts requests with the correct version passed in the version header', async () => {
      await kbnTestServer.request
        .get(root, testRoute)
        .set(versionHeader, actualVersion)
        .expect(200, 'ok');
    });

    it('accepts requests that do not include a version header', async () => {
      await kbnTestServer.request.get(root, testRoute).expect(200, 'ok');
    });

    it('rejects requests with an incorrect version passed in the version header', async () => {
      await kbnTestServer.request
        .get(root, testRoute)
        .set(versionHeader, 'invalid-version')
        .expect(400, /"Browser client is out of date/);
    });
  });

  describe('customHeaders pre-response handler', () => {
    const testRoute = '/custom_headers/test/route';

    beforeEach(() => {
      kbnTestServer.getKbnServer(root).server.route({
        path: testRoute,
        method: 'GET',
        handler: () => 'ok',
      });
    });

    it('adds the kbn-name header', async () => {
      const result = await kbnTestServer.request.get(root, testRoute).expect(200, 'ok');
      const headers = result.header as Record<string, string>;
      expect(headers).toEqual(
        expect.objectContaining({
          [nameHeader]: kibanaName,
        })
      );
    });

    it('adds the custom headers', async () => {
      const result = await kbnTestServer.request.get(root, testRoute).expect(200, 'ok');
      const headers = result.header as Record<string, string>;
      expect(headers).toEqual(expect.objectContaining({ 'some-header': 'some-value' }));
    });
  });

  describe('xsrf post-auth handler', () => {
    const testPath = '/xsrf/test/route';
    const destructiveMethods = ['POST', 'PUT', 'DELETE'];
    const nonDestructiveMethods = ['GET', 'HEAD'];

    beforeEach(() => {
      const kbnServer = kbnTestServer.getKbnServer(root);

      kbnServer.server.route({
        path: testPath,
        method: 'GET',
        handler: () => 'ok',
      });

      kbnServer.server.route({
        path: testPath,
        method: destructiveMethods,
        handler: () => 'ok',
      });

      kbnServer.server.route({
        path: whitelistedTestPath,
        method: destructiveMethods,
        handler: () => 'ok',
      });
    });

    nonDestructiveMethods.forEach(method => {
      describe(`When using non-destructive ${method} method`, () => {
        it('accepts requests without a token', async () => {
          await kbnTestServer
            .getSupertest(root, method.toLowerCase() as kbnTestServer.HttpMethod, testPath)
            .expect(200, method === 'HEAD' ? undefined : 'ok');
        });

        it('accepts requests with the xsrf header', async () => {
          await kbnTestServer
            .getSupertest(root, method.toLowerCase() as kbnTestServer.HttpMethod, testPath)
            .set(xsrfHeader, 'anything')
            .expect(200, method === 'HEAD' ? undefined : 'ok');
        });
      });
    });

    destructiveMethods.forEach(method => {
      describe(`When using destructive ${method} method`, () => {
        it('accepts requests with the xsrf header', async () => {
          await kbnTestServer
            .getSupertest(root, method.toLowerCase() as kbnTestServer.HttpMethod, testPath)
            .set(xsrfHeader, 'anything')
            .expect(200, 'ok');
        });

        it('accepts requests with the version header', async () => {
          await kbnTestServer
            .getSupertest(root, method.toLowerCase() as kbnTestServer.HttpMethod, testPath)
            .set(versionHeader, actualVersion)
            .expect(200, 'ok');
        });

        it('rejects requests without either an xsrf or version header', async () => {
          await kbnTestServer
            .getSupertest(root, method.toLowerCase() as kbnTestServer.HttpMethod, testPath)
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message: 'Request must contain a kbn-xsrf header.',
            });
        });

        it('accepts whitelisted requests without either an xsrf or version header', async () => {
          await kbnTestServer
            .getSupertest(
              root,
              method.toLowerCase() as kbnTestServer.HttpMethod,
              whitelistedTestPath
            )
            .expect(200, 'ok');
        });
      });
    });
  });
});
