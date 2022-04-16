/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { duration } from 'moment';
import { getProxyRouteHandlerDeps } from './mocks';

import { kibanaResponseFactory } from '@kbn/core/server';
import * as requestModule from '../../../../lib/proxy_request';
import { createHandler } from './create_handler';

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
