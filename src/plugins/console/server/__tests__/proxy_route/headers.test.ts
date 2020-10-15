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
jest.mock('../../../../../core/server/http/router/request', () => ({
  ensureRawRequest: jest.fn(),
}));

import { kibanaResponseFactory } from '../../../../../core/server';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ensureRawRequest } from '../../../../../core/server/http/router/request';

import { getProxyRouteHandlerDeps } from './mocks';

import expect from '@kbn/expect';
import * as requestModule from '../../lib/proxy_request';

import { createHandler } from '../../routes/api/console/proxy/create_handler';

import { createResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    (requestModule.proxyRequest as jest.Mock).mockResolvedValue(createResponseStub(''));
    handler = createHandler(getProxyRouteHandlerDeps({}));
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe('headers', () => {
    it('forwards the remote header info', async () => {
      (ensureRawRequest as jest.Mock).mockReturnValue({
        // This mocks the shape of the hapi request object, will probably change
        info: {
          remoteAddress: '0.0.0.0',
          remotePort: '1234',
          host: 'test',
        },
        server: {
          info: {
            protocol: 'http',
          },
        },
      });

      await handler(
        {} as any,
        {
          headers: {},
          query: {
            method: 'POST',
            path: '/api/console/proxy?method=GET&path=/',
          },
        } as any,
        kibanaResponseFactory
      );

      expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).to.be(1);
      const [[{ headers }]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
      expect(headers).to.have.property('x-forwarded-for');
      expect(headers['x-forwarded-for']).to.be('0.0.0.0');
      expect(headers).to.have.property('x-forwarded-port');
      expect(headers['x-forwarded-port']).to.be('1234');
      expect(headers).to.have.property('x-forwarded-proto');
      expect(headers['x-forwarded-proto']).to.be('http');
      expect(headers).to.have.property('x-forwarded-host');
      expect(headers['x-forwarded-host']).to.be('test');
    });
  });
});
