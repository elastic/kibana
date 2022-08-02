/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IKibanaResponse } from '@kbn/core/server';
import { getProxyRouteHandlerDeps } from './mocks';

import { Readable } from 'stream';

import { kibanaResponseFactory } from '@kbn/core/server';
import { createHandler } from './create_handler';
import * as requestModule from '../../../../lib/proxy_request';
import { createResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  let request: (
    method: string,
    path: string,
    response?: string
  ) => Promise<IKibanaResponse> | IKibanaResponse;

  beforeEach(() => {
    request = (method, path, response) => {
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
        expect(await readStream(payload)).toBe('foobar');
      });
    });
    describe('POST request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('POST', '/', 'foobar');
        expect(await readStream(payload)).toBe('foobar');
      });
    });
    describe('PUT request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('PUT', '/', 'foobar');
        expect(await readStream(payload)).toBe('foobar');
      });
    });
    describe('DELETE request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('DELETE', '/', 'foobar');
        expect(await readStream(payload)).toBe('foobar');
      });
    });
    describe('HEAD request', () => {
      it('returns the status code and text', async () => {
        const { payload } = await request('HEAD', '/');
        expect(typeof payload).toBe('string');
        expect(payload).toBe('200 - OK');
      });
      describe('mixed casing', () => {
        it('returns the status code and text', async () => {
          const { payload } = await request('HeAd', '/');
          expect(typeof payload).toBe('string');
          expect(payload).toBe('200 - OK');
        });
      });
    });
  });
});
