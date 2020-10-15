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

import {
  createCustomHeadersPreResponseHandler,
  createVersionCheckPostAuthHandler,
  createXsrfPostAuthHandler,
} from './lifecycle_handlers';
import { httpServerMock } from './http_server.mocks';
import { HttpConfig } from './http_config';
import { KibanaRequest, RouteMethod, KibanaRouteOptions } from './router';

const createConfig = (partial: Partial<HttpConfig>): HttpConfig => partial as HttpConfig;

const forgeRequest = ({
  headers = {},
  path = '/',
  method = 'get',
  kibanaRouteOptions,
}: Partial<{
  headers: Record<string, string>;
  path: string;
  method: RouteMethod;
  kibanaRouteOptions: KibanaRouteOptions;
}>): KibanaRequest => {
  return httpServerMock.createKibanaRequest({
    headers,
    path,
    method,
    kibanaRouteOptions,
  });
};

describe('xsrf post-auth handler', () => {
  let toolkit: ReturnType<typeof httpServerMock.createToolkit>;
  let responseFactory: ReturnType<typeof httpServerMock.createLifecycleResponseFactory>;

  beforeEach(() => {
    toolkit = httpServerMock.createToolkit();
    responseFactory = httpServerMock.createLifecycleResponseFactory();
  });

  describe('non destructive methods', () => {
    it('accepts requests without version or xsrf header', () => {
      const config = createConfig({ xsrf: { whitelist: [], disableProtection: false } });
      const handler = createXsrfPostAuthHandler(config);
      const request = forgeRequest({ method: 'get', headers: {} });

      toolkit.next.mockReturnValue('next' as any);

      const result = handler(request, responseFactory, toolkit);

      expect(responseFactory.badRequest).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
      expect(result).toEqual('next');
    });
  });

  describe('destructive methods', () => {
    it('accepts requests with xsrf header', () => {
      const config = createConfig({ xsrf: { whitelist: [], disableProtection: false } });
      const handler = createXsrfPostAuthHandler(config);
      const request = forgeRequest({ method: 'post', headers: { 'kbn-xsrf': 'xsrf' } });

      toolkit.next.mockReturnValue('next' as any);

      const result = handler(request, responseFactory, toolkit);

      expect(responseFactory.badRequest).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
      expect(result).toEqual('next');
    });

    it('accepts requests with version header', () => {
      const config = createConfig({ xsrf: { whitelist: [], disableProtection: false } });
      const handler = createXsrfPostAuthHandler(config);
      const request = forgeRequest({ method: 'post', headers: { 'kbn-version': 'some-version' } });

      toolkit.next.mockReturnValue('next' as any);

      const result = handler(request, responseFactory, toolkit);

      expect(responseFactory.badRequest).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
      expect(result).toEqual('next');
    });

    it('returns a bad request if called without xsrf or version header', () => {
      const config = createConfig({ xsrf: { whitelist: [], disableProtection: false } });
      const handler = createXsrfPostAuthHandler(config);
      const request = forgeRequest({ method: 'post' });

      responseFactory.badRequest.mockReturnValue('badRequest' as any);

      const result = handler(request, responseFactory, toolkit);

      expect(toolkit.next).not.toHaveBeenCalled();
      expect(responseFactory.badRequest).toHaveBeenCalledTimes(1);
      expect(responseFactory.badRequest.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "body": "Request must contain a kbn-xsrf header.",
        }
      `);
      expect(result).toEqual('badRequest');
    });

    it('accepts requests if protection is disabled', () => {
      const config = createConfig({ xsrf: { whitelist: [], disableProtection: true } });
      const handler = createXsrfPostAuthHandler(config);
      const request = forgeRequest({ method: 'post', headers: {} });

      toolkit.next.mockReturnValue('next' as any);

      const result = handler(request, responseFactory, toolkit);

      expect(responseFactory.badRequest).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
      expect(result).toEqual('next');
    });

    it('accepts requests if path is whitelisted', () => {
      const config = createConfig({
        xsrf: { whitelist: ['/some-path'], disableProtection: false },
      });
      const handler = createXsrfPostAuthHandler(config);
      const request = forgeRequest({ method: 'post', headers: {}, path: '/some-path' });

      toolkit.next.mockReturnValue('next' as any);

      const result = handler(request, responseFactory, toolkit);

      expect(responseFactory.badRequest).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
      expect(result).toEqual('next');
    });

    it('accepts requests if xsrf protection on a route is disabled', () => {
      const config = createConfig({
        xsrf: { whitelist: [], disableProtection: false },
      });
      const handler = createXsrfPostAuthHandler(config);
      const request = forgeRequest({
        method: 'post',
        headers: {},
        path: '/some-path',
        kibanaRouteOptions: {
          xsrfRequired: false,
        },
      });

      toolkit.next.mockReturnValue('next' as any);

      const result = handler(request, responseFactory, toolkit);

      expect(responseFactory.badRequest).not.toHaveBeenCalled();
      expect(toolkit.next).toHaveBeenCalledTimes(1);
      expect(result).toEqual('next');
    });
  });
});

describe('versionCheck post-auth handler', () => {
  let toolkit: ReturnType<typeof httpServerMock.createToolkit>;
  let responseFactory: ReturnType<typeof httpServerMock.createLifecycleResponseFactory>;

  beforeEach(() => {
    toolkit = httpServerMock.createToolkit();
    responseFactory = httpServerMock.createLifecycleResponseFactory();
  });

  it('forward the request to the next interceptor if header matches', () => {
    const handler = createVersionCheckPostAuthHandler('actual-version');
    const request = forgeRequest({ headers: { 'kbn-version': 'actual-version' } });

    toolkit.next.mockReturnValue('next' as any);

    const result = handler(request, responseFactory, toolkit);

    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(responseFactory.badRequest).not.toHaveBeenCalled();
    expect(result).toBe('next');
  });

  it('returns a badRequest error if header does not match', () => {
    const handler = createVersionCheckPostAuthHandler('actual-version');
    const request = forgeRequest({ headers: { 'kbn-version': 'another-version' } });

    responseFactory.badRequest.mockReturnValue('badRequest' as any);

    const result = handler(request, responseFactory, toolkit);

    expect(toolkit.next).not.toHaveBeenCalled();
    expect(responseFactory.badRequest).toHaveBeenCalledTimes(1);
    expect(responseFactory.badRequest.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "attributes": Object {
            "expected": "actual-version",
            "got": "another-version",
          },
          "message": "Browser client is out of date, please refresh the page (\\"kbn-version\\" header was \\"another-version\\" but should be \\"actual-version\\")",
        },
      }
    `);
    expect(result).toBe('badRequest');
  });

  it('forward the request to the next interceptor if header is not present', () => {
    const handler = createVersionCheckPostAuthHandler('actual-version');
    const request = forgeRequest({ headers: {} });

    toolkit.next.mockReturnValue('next' as any);

    const result = handler(request, responseFactory, toolkit);

    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(responseFactory.badRequest).not.toHaveBeenCalled();
    expect(result).toBe('next');
  });
});

describe('customHeaders pre-response handler', () => {
  let toolkit: ReturnType<typeof httpServerMock.createToolkit>;

  beforeEach(() => {
    toolkit = httpServerMock.createToolkit();
  });

  it('adds the kbn-name header to the response', () => {
    const config = createConfig({ name: 'my-server-name' });
    const handler = createCustomHeadersPreResponseHandler(config as HttpConfig);

    handler({} as any, {} as any, toolkit);

    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({ headers: { 'kbn-name': 'my-server-name' } });
  });

  it('adds the custom headers defined in the configuration', () => {
    const config = createConfig({
      name: 'my-server-name',
      customResponseHeaders: {
        headerA: 'value-A',
        headerB: 'value-B',
      },
    });
    const handler = createCustomHeadersPreResponseHandler(config as HttpConfig);

    handler({} as any, {} as any, toolkit);

    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-name': 'my-server-name',
        headerA: 'value-A',
        headerB: 'value-B',
      },
    });
  });

  it('preserve the kbn-name value from server.name if definied in custom headders ', () => {
    const config = createConfig({
      name: 'my-server-name',
      customResponseHeaders: {
        'kbn-name': 'custom-name',
        headerA: 'value-A',
        headerB: 'value-B',
      },
    });
    const handler = createCustomHeadersPreResponseHandler(config as HttpConfig);

    handler({} as any, {} as any, toolkit);

    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-name': 'my-server-name',
        headerA: 'value-A',
        headerB: 'value-B',
      },
    });
  });
});
