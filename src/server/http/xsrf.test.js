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

import { fromNode as fn } from 'bluebird';
import { resolve } from 'path';
import * as kbnTestServer from '../../test_utils/kbn_server';

const destructiveMethods = ['POST', 'PUT', 'DELETE'];
const src = resolve.bind(null, __dirname, '../../../src');

const xsrfHeader = 'kbn-xsrf';
const versionHeader = 'kbn-version';
const testPath = '/xsrf/test/route';
const whitelistedTestPath = '/xsrf/test/route/whitelisted';
const actualVersion = require(src('../package.json')).version;

describe('xsrf request filter', function () {
  function inject(kbnServer, opts) {
    return fn(cb => {
      kbnTestServer.makeRequest(kbnServer, opts, (resp) => {
        cb(null, resp);
      });
    });
  }

  const makeServer = async function () {
    const kbnServer = kbnTestServer.createServer({
      server: {
        xsrf: {
          disableProtection: false,
          whitelist: [whitelistedTestPath]
        }
      }
    });

    await kbnServer.ready();

    kbnServer.server.route({
      path: testPath,
      method: 'GET',
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    kbnServer.server.route({
      path: testPath,
      method: destructiveMethods,
      config: {
        // Disable payload parsing to make HapiJS server accept any content-type header.
        payload: {
          parse: false
        }
      },
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    kbnServer.server.route({
      path: whitelistedTestPath,
      method: destructiveMethods,
      config: {
        // Disable payload parsing to make HapiJS server accept any content-type header.
        payload: {
          parse: false
        }
      },
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    return kbnServer;
  };

  let kbnServer;
  beforeEach(async () => {
    kbnServer = await makeServer();
  });

  afterEach(async () => {
    await kbnServer.close();
  });

  describe(`nonDestructiveMethod: GET`, function () {
    it('accepts requests without a token', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'GET'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('ok');
    });

    it('accepts requests with the xsrf header', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'GET',
        headers: {
          [xsrfHeader]: 'anything',
        },
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('ok');
    });
  });

  describe(`nonDestructiveMethod: HEAD`, function () {
    it('accepts requests without a token', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'HEAD'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toHaveLength(0);
    });

    it('accepts requests with the xsrf header', async function () {
      const resp = await inject(kbnServer, {
        url: testPath,
        method: 'HEAD',
        headers: {
          [xsrfHeader]: 'anything',
        },
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toHaveLength(0);
    });
  });

  for (const method of destructiveMethods) {
    describe(`destructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
      it('accepts requests with the xsrf header', async function () {
        const resp = await inject(kbnServer, {
          url: testPath,
          method: method,
          headers: {
            [xsrfHeader]: 'anything',
          },
        });

        expect(resp.statusCode).toBe(200);
        expect(resp.payload).toBe('ok');
      });

      // this is still valid for existing csrf protection support
      // it does not actually do any validation on the version value itself
      it('accepts requests with the version header', async function () {
        const resp = await inject(kbnServer, {
          url: testPath,
          method: method,
          headers: {
            [versionHeader]: actualVersion,
          },
        });

        expect(resp.statusCode).toBe(200);
        expect(resp.payload).toBe('ok');
      });

      it('rejects requests without either an xsrf or version header', async function () {
        const resp = await inject(kbnServer, {
          url: testPath,
          method: method
        });

        expect(resp.statusCode).toBe(400);
        expect(resp.result.message).toBe('Request must contain a kbn-xsrf header.');
      });

      it('accepts whitelisted requests without either an xsrf or version header', async function () {
        const resp = await inject(kbnServer, {
          url: whitelistedTestPath,
          method: method
        });

        expect(resp.statusCode).toBe(200);
        expect(resp.payload).toBe('ok');
      });
    });
  }
});
