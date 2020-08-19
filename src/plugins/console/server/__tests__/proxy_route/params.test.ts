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
import { kibanaResponseFactory } from '../../../../../core/server';
import { getProxyRouteHandlerDeps } from './mocks';
import { createResponseStub } from './stubs';
import * as requestModule from '../../lib/proxy_request';
import expect from '@kbn/expect';

import { createHandler } from '../../routes/api/console/proxy/create_handler';

describe('Console Proxy Route', () => {
  let handler: ReturnType<typeof createHandler>;

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('params', () => {
    describe('pathFilters', () => {
      describe('no matches', () => {
        it('rejects with 403', async () => {
          handler = createHandler(
            getProxyRouteHandlerDeps({ proxy: { pathFilters: [/^\/foo\//, /^\/bar\//] } })
          );

          const { status } = await handler(
            {} as any,
            { query: { method: 'POST', path: '/baz/id' } } as any,
            kibanaResponseFactory
          );

          expect(status).to.be(403);
        });
      });
      describe('one match', () => {
        it('allows the request', async () => {
          handler = createHandler(
            getProxyRouteHandlerDeps({ proxy: { pathFilters: [/^\/foo\//, /^\/bar\//] } })
          );

          (requestModule.proxyRequest as jest.Mock).mockResolvedValue(createResponseStub('foo'));

          const { status } = await handler(
            {} as any,
            { headers: {}, query: { method: 'POST', path: '/foo/id' } } as any,
            kibanaResponseFactory
          );

          expect(status).to.be(200);
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).to.be(1);
        });
      });
      describe('all match', () => {
        it('allows the request', async () => {
          handler = createHandler(
            getProxyRouteHandlerDeps({ proxy: { pathFilters: [/^\/foo\//] } })
          );

          (requestModule.proxyRequest as jest.Mock).mockResolvedValue(createResponseStub('foo'));

          const { status } = await handler(
            {} as any,
            { headers: {}, query: { method: 'GET', path: '/foo/id' } } as any,
            kibanaResponseFactory
          );

          expect(status).to.be(200);
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).to.be(1);
        });
      });
    });
  });
});
