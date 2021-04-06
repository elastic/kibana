/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { kibanaResponseFactory } from '../../../../../../../core/server';
import { getProxyRouteHandlerDeps } from './mocks';
import { createResponseStub } from './stubs';
import * as requestModule from '../../../../lib/proxy_request';

import { createHandler } from './create_handler';

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

          expect(status).toBe(403);
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

          expect(status).toBe(200);
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).toBe(1);
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

          expect(status).toBe(200);
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).toBe(1);
        });
      });
    });
  });
});
