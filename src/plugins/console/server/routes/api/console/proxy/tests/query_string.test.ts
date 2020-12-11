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
import { kibanaResponseFactory } from '../../../../../../../../core/server';
import { getProxyRouteHandlerDeps } from './mocks';
import { createResponseStub } from './stubs';
import * as requestModule from '../../../../../lib/proxy_request';

import expect from '@kbn/expect';

import { createHandler } from '../create_handler';

describe('Console Proxy Route', () => {
  let request: any;
  beforeEach(() => {
    (requestModule.proxyRequest as jest.Mock).mockResolvedValue(createResponseStub('foo'));

    request = async (method: string, path: string) => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));

      return handler(
        {} as any,
        { headers: {}, query: { method, path } } as any,
        kibanaResponseFactory
      );
    };
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe('query string', () => {
    describe('path', () => {
      describe('contains full url', () => {
        it('treats the url as a path', async () => {
          await request('GET', 'http://evil.com/test');
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).to.be(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).to.be('http://localhost:9200/http://evil.com/test?pretty=true');
        });
      });
      describe('starts with a slash', () => {
        it('combines well with the base url', async () => {
          await request('GET', '/index/id');
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).to.be(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).to.be('http://localhost:9200/index/id?pretty=true');
        });
      });
      describe(`doesn't start with a slash`, () => {
        it('combines well with the base url', async () => {
          await request('GET', 'index/id');
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).to.be(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).to.be('http://localhost:9200/index/id?pretty=true');
        });
      });
    });
  });
});
