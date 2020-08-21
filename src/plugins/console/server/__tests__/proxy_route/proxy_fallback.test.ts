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

import { duration } from 'moment';
import { getProxyRouteHandlerDeps } from './mocks';

import { kibanaResponseFactory } from '../../../../../core/server';
import { createHandler } from '../../routes/api/console/proxy/create_handler';
import * as requestModule from '../../lib/proxy_request';

describe('Console Proxy Route', () => {
  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe('fallback behaviour', () => {
    it('falls back to all configured endpoints regardless of error', async () => {
      // Describe a situation where all three configured nodes reject
      (requestModule.proxyRequest as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      (requestModule.proxyRequest as jest.Mock).mockRejectedValueOnce(new Error('EHOSTUNREACH'));
      (requestModule.proxyRequest as jest.Mock).mockRejectedValueOnce(new Error('ESOCKETTIMEDOUT'));

      const handler = createHandler(
        getProxyRouteHandlerDeps({
          proxy: {
            readLegacyESConfig: async () => ({
              requestTimeout: duration(30000),
              customHeaders: {},
              requestHeadersWhitelist: [],
              hosts: ['http://localhost:9201', 'http://localhost:9202', 'http://localhost:9203'],
            }),
          },
        })
      );

      const response = await handler(
        {} as any,
        {
          headers: {},
          query: { method: 'get', path: 'test' },
        } as any,
        kibanaResponseFactory
      );

      expect(response.status).toBe(502);
      // Return the message from the ES node we attempted last.
      expect(response.payload.message).toBe('ESOCKETTIMEDOUT');
    });
  });
});
