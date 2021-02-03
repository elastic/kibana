/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { kibanaResponseFactory } from '../../../../../../../core/server';
import { getProxyRouteHandlerDeps } from './mocks';
import { createResponseStub } from './stubs';
import * as requestModule from '../../../../lib/proxy_request';

import { createHandler } from './create_handler';

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
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).toBe(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).toBe('http://localhost:9200/http://evil.com/test?pretty=true');
        });
      });
      describe('starts with a slash', () => {
        it('combines well with the base url', async () => {
          await request('GET', '/index/id');
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).toBe(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).toBe('http://localhost:9200/index/id?pretty=true');
        });
      });
      describe(`doesn't start with a slash`, () => {
        it('combines well with the base url', async () => {
          await request('GET', 'index/id');
          expect((requestModule.proxyRequest as jest.Mock).mock.calls.length).toBe(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).toBe('http://localhost:9200/index/id?pretty=true');
        });
      });
    });
  });
});
