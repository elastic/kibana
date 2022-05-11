/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { getProxyRouteHandlerDeps } from './mocks';
import { createResponseStub } from './stubs';
import * as requestModule from '../../../../lib/proxy_request';

import { createHandler } from './create_handler';

describe('Console Proxy Route', () => {
  let request: (method: string, path: string) => Promise<IKibanaResponse> | IKibanaResponse;
  const proxyRequestMock = requestModule.proxyRequest as jest.Mock;

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
          expect(proxyRequestMock.mock.calls.length).toBe(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).toBe('http://localhost:9200/http://evil.com/test?pretty=true');
        });
      });
      describe('starts with a slash', () => {
        it('combines well with the base url', async () => {
          await request('GET', '/index/id');
          expect(proxyRequestMock.mock.calls.length).toBe(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).toBe('http://localhost:9200/index/id?pretty=true');
        });
      });
      describe(`doesn't start with a slash`, () => {
        it('combines well with the base url', async () => {
          await request('GET', 'index/id');
          expect(proxyRequestMock.mock.calls.length).toBe(1);
          const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
          expect(args.uri.href).toBe('http://localhost:9200/index/id?pretty=true');
        });
      });
      describe('contains special characters', () => {
        it('correctly encodes plus sign', async () => {
          const path = '/_search?q=create_date:[2022-03-10T08:00:00.000+08:00 TO *]';

          const { status } = await request('GET', path);
          expect(status).toBe(200);
          expect(proxyRequestMock.mock.calls.length).toBe(1);
          const [[args]] = proxyRequestMock.mock.calls;
          expect(args.uri.search).toEqual(
            '?q=create_date%3A%5B2022-03-10T08%3A00%3A00.000%2B08%3A00+TO+*%5D&pretty=true'
          );
        });
      });
    });
  });
});
