/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('@kbn/core/server/http/router/request', () => ({
  ensureRawRequest: jest.fn(),
}));

import { kibanaResponseFactory } from '@kbn/core/server';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ensureRawRequest } from '@kbn/core/server/http/router/request';

import { getProxyRouteHandlerDeps } from './mocks';

import * as requestModule from '../../../../lib/proxy_request';

import { createHandler } from './create_handler';

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

      expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).toBe(1);
      const [[{ headers }]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
      expect(headers).toHaveProperty('x-forwarded-for');
      expect(headers['x-forwarded-for']).toBe('0.0.0.0');
      expect(headers).toHaveProperty('x-forwarded-port');
      expect(headers['x-forwarded-port']).toBe('1234');
      expect(headers).toHaveProperty('x-forwarded-proto');
      expect(headers['x-forwarded-proto']).toBe('http');
      expect(headers).toHaveProperty('x-forwarded-host');
      expect(headers['x-forwarded-host']).toBe('test');
    });

    it('sends product-origin header when withProductOrigin query param is set', async () => {
      await handler(
        {} as any,
        {
          headers: {},
          query: {
            method: 'POST',
            path: '/api/console/proxy?path=_aliases&method=GET',
            withProductOrigin: true,
          },
        } as any,
        kibanaResponseFactory
      );

      const [[{ headers }]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
      expect(headers).toHaveProperty('x-elastic-product-origin');
      expect(headers['x-elastic-product-origin']).toBe('kibana');
    });
  });
});
