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
import { getProxyRouteHandlerDeps } from './mocks';

import expect from '@kbn/expect';
import { Readable } from 'stream';

import { kibanaResponseFactory } from '../../../../../core/server';
import { createHandler } from '../../routes/api/console/proxy/create_handler';
import * as requestModule from '../../lib/proxy_request';
import { createResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  let request: any;

  beforeEach(() => {
    request = (method: string, path: string, response: string) => {
      (requestModule.proxyRequest as jest.Mock).mockResolvedValue(createResponseStub(response));
      const handler = createHandler(getProxyRouteHandlerDeps({}));

      return handler(
        {} as any,
        {
          headers: {},
          query: { method, path },
        } as any,
        kibanaResponseFactory
      );
    };
  });

  const readStream = (s: Readable) =>
    new Promise((resolve) => {
      let v = '';
      s.on('data', (data) => {
        v += data;
      });
      s.on('end', () => resolve(v));
    });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe('response body', () => {
    describe('GET request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('GET', '/', 'foobar');
        expect(await readStream(payload)).to.be('foobar');
      });
    });
    describe('POST request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('POST', '/', 'foobar');
        expect(await readStream(payload)).to.be('foobar');
      });
    });
    describe('PUT request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('PUT', '/', 'foobar');
        expect(await readStream(payload)).to.be('foobar');
      });
    });
    describe('DELETE request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('DELETE', '/', 'foobar');
        expect(await readStream(payload)).to.be('foobar');
      });
    });
    describe('HEAD request', () => {
      it('returns the status code and text', async () => {
        const { payload } = await request('HEAD', '/');
        expect(typeof payload).to.be('string');
        expect(payload).to.be('200 - OK');
      });
      describe('mixed casing', () => {
        it('returns the status code and text', async () => {
          const { payload } = await request('HeAd', '/');
          expect(typeof payload).to.be('string');
          expect(payload).to.be('200 - OK');
        });
      });
    });
  });
});
