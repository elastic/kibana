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

import sinon from 'sinon';
import Wreck from '@hapi/wreck';
import expect from '@kbn/expect';
import { Server } from 'hapi';

import { createProxyRoute } from '../../';

import { createWreckResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  const sandbox = sinon.createSandbox();
  const teardowns = [];
  let request;

  beforeEach(() => {
    request = async (method, path, response) => {
      sandbox.stub(Wreck, 'request').callsFake(createWreckResponseStub(response));

      const server = new Server();
      server.route(
        createProxyRoute({
          baseUrl: 'http://localhost:9200',
        })
      );

      teardowns.push(() => server.stop());

      const params = [];
      if (path != null) params.push(`path=${path}`);
      if (method != null) params.push(`method=${method}`);
      return await server.inject({
        method: 'POST',
        url: `/api/console/proxy${params.length ? `?${params.join('&')}` : ''}`,
      });
    };
  });

  afterEach(async () => {
    sandbox.restore();
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('response body', () => {
    describe('GET request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('GET', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('POST request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('POST', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('PUT request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('PUT', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('DELETE request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('DELETE', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('HEAD request', () => {
      it('returns the status code and text', async () => {
        const { payload } = await request('HEAD', '/');
        expect(payload).to.be('200 - OK');
      });
      describe('mixed casing', () => {
        it('returns the status code and text', async () => {
          const { payload } = await request('HeAd', '/');
          expect(payload).to.be('200 - OK');
        });
      });
    });
  });
});
