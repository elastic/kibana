/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetchMock from 'fetch-mock';
import { readFileSync } from 'fs';
import { join } from 'path';
import { first } from 'rxjs';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import type { HttpResponse, HttpFetchOptionsWithPath } from '@kbn/core-http-browser';

import { Fetch } from './fetch';
import { BasePath } from './base_path';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

function delay<T>(duration: number) {
  return new Promise<T>((r) => setTimeout(r, duration));
}

const BASE_PATH = 'http://localhost/myBase';

describe('Fetch', () => {
  const executionContextMock = executionContextServiceMock.createSetupContract();
  const fetchInstance = new Fetch({
    basePath: new BasePath({ basePath: BASE_PATH }),
    kibanaVersion: 'VERSION',
    buildNumber: 1234,
    executionContext: executionContextMock,
  });
  afterEach(() => {
    fetchMock.restore();
    fetchInstance.removeAllInterceptors();
  });

  describe('getRequestCount$', () => {
    const getCurrentRequestCount = () => fetchInstance.getRequestCount$().pipe(first()).toPromise();

    it('should increase and decrease when request receives success response', async () => {
      fetchMock.get('*', 200);

      const fetchResponse = fetchInstance.fetch('/path');
      expect(await getCurrentRequestCount()).toEqual(1);

      await expect(fetchResponse).resolves.not.toThrow();
      expect(await getCurrentRequestCount()).toEqual(0);
    });

    it('should increase and decrease when request receives error response', async () => {
      fetchMock.get('*', 500);

      const fetchResponse = fetchInstance.fetch('/path');
      expect(await getCurrentRequestCount()).toEqual(1);

      await expect(fetchResponse).rejects.toThrow();
      expect(await getCurrentRequestCount()).toEqual(0);
    });

    it('should increase and decrease when request fails', async () => {
      fetchMock.get('*', Promise.reject('Network!'));

      const fetchResponse = fetchInstance.fetch('/path');
      expect(await getCurrentRequestCount()).toEqual(1);

      await expect(fetchResponse).rejects.toThrow();
      expect(await getCurrentRequestCount()).toEqual(0);
    });

    it('should change for multiple requests', async () => {
      fetchMock.get(`${BASE_PATH}/success`, 200);
      fetchMock.get(`${BASE_PATH}/fail`, 400);
      fetchMock.get(`${BASE_PATH}/network-fail`, Promise.reject('Network!'));

      const requestCounts: number[] = [];
      const subscription = fetchInstance
        .getRequestCount$()
        .subscribe((count) => requestCounts.push(count));

      const success1 = fetchInstance.fetch('/success');
      const success2 = fetchInstance.fetch('/success');
      const failure1 = fetchInstance.fetch('/fail');
      const failure2 = fetchInstance.fetch('/fail');
      const networkFailure1 = fetchInstance.fetch('/network-fail');
      const success3 = fetchInstance.fetch('/success');
      const failure3 = fetchInstance.fetch('/fail');
      const networkFailure2 = fetchInstance.fetch('/network-fail');

      const swallowError = (p: Promise<any>) => p.catch(() => {});
      await Promise.all([
        success1,
        success2,
        success3,
        swallowError(failure1),
        swallowError(failure2),
        swallowError(failure3),
        swallowError(networkFailure1),
        swallowError(networkFailure2),
      ]);

      expect(requestCounts).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
      subscription.unsubscribe();
    });
  });

  describe('http requests', () => {
    it('should fail with invalid arguments', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch(
          // @ts-expect-error
          { path: '/', headers: { hello: 'world' } },
          { headers: { hello: 'mars' } }
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch arguments, must either be (string, object) or (object, undefined), received (object, object)"`
      );
    });

    it('should use supplied request method', async () => {
      fetchMock.post('*', {});
      await fetchInstance.fetch('/my/path', { method: 'POST' });

      expect(fetchMock.lastOptions()!.method).toBe('POST');
    });

    it('should use supplied Content-Type', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', { headers: { 'Content-Type': 'CustomContentType' } });

      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'content-type': 'CustomContentType',
      });
    });

    it('should not set Content-Type if undefined', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', { headers: { 'Content-Type': undefined } });

      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'kbn-version': 'VERSION',
      });
    });

    it('should use supplied pathname and querystring', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', { query: { a: 'b' } });

      expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path?a=b');
    });

    it('should use supplied headers', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', {
        headers: { myHeader: 'foo' },
      });

      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'content-type': 'application/json',
        'kbn-version': 'VERSION',
        'kbn-build-number': '1234',
        'x-elastic-internal-origin': 'Kibana',
        myheader: 'foo',
      });
    });

    it('should not allow overwriting of kbn-version header', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: {
            myHeader: 'foo',
            'kbn-version': 'CUSTOM!',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"kbn-\\" are not allowed: [kbn-version]"`
      );
    });
    it('should not allow overwriting of kbn-build-number header', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: {
            myHeader: 'foo',
            'kbn-build-number': 4321,
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"kbn-\\" are not allowed: [kbn-build-number]"`
      );
    });

    it('should not allow overwriting of x-elastic-internal-origin header', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: {
            myHeader: 'foo',
            'x-elastic-internal-origin': 'anything',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"x-elastic-internal-\\" are not allowed: [x-elastic-internal-origin]"`
      );
    });

    it('should not set kbn-system-request header by default', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', {
        headers: { myHeader: 'foo' },
      });

      expect(fetchMock.lastOptions()!.headers?.['kbn-system-request']).toBeUndefined();
    });

    it('should not set kbn-system-request header when asSystemRequest: false', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', {
        headers: { myHeader: 'foo' },
        asSystemRequest: false,
      });

      expect(fetchMock.lastOptions()!.headers?.['kbn-system-request']).toBeUndefined();
    });

    it('should set kbn-system-request header when asSystemRequest: true', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', {
        headers: { myHeader: 'foo' },
        asSystemRequest: true,
      });

      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'kbn-system-request': 'true',
        myheader: 'foo',
      });
    });

    it('should not allow overwriting of kbn-system-request when asSystemRequest: true', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: { myHeader: 'foo', 'kbn-system-request': 'ANOTHER!' },
          asSystemRequest: true,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"kbn-\\" are not allowed: [kbn-system-request]"`
      );
    });

    it('should not allow overwriting of kbn-system-request when asSystemRequest: false', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: { myHeader: 'foo', 'kbn-system-request': 'ANOTHER!' },
          asSystemRequest: false,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"kbn-\\" are not allowed: [kbn-system-request]"`
      );
    });

    it('should inject context headers if provided', async () => {
      fetchMock.get('*', {});

      const context = {
        type: 'test-type',
        name: 'test-name',
        description: 'test-description',
        id: '42',
      };
      executionContextMock.withGlobalContext.mockReturnValue(context);
      await fetchInstance.fetch('/my/path', {
        context,
      });

      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'x-kbn-context':
          '%7B%22type%22%3A%22test-type%22%2C%22name%22%3A%22test-name%22%2C%22description%22%3A%22test-description%22%2C%22id%22%3A%2242%22%7D',
      });
    });

    it('should include top level context context headers if provided', async () => {
      fetchMock.get('*', {});

      const context = {
        type: 'test-type',
        name: 'test-name',
        description: 'test-description',
        id: '42',
      };
      executionContextMock.withGlobalContext.mockReturnValue({
        ...context,
        name: 'banana',
      });
      await fetchInstance.fetch('/my/path', {
        context,
      });

      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'x-kbn-context':
          '%7B%22type%22%3A%22test-type%22%2C%22name%22%3A%22banana%22%2C%22description%22%3A%22test-description%22%2C%22id%22%3A%2242%22%7D',
      });
    });

    it('should return response', async () => {
      fetchMock.get('*', { foo: 'bar' });
      const json = await fetchInstance.fetch('/my/path');
      expect(json).toEqual({ foo: 'bar' });
    });

    it('should prepend url with basepath by default', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path');
      expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path');
    });

    it('should not prepend url with basepath when disabled', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('my/path', { prependBasePath: false });
      expect(fetchMock.lastUrl()).toBe('/my/path');
    });

    it('should not include undefined query params', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', { query: { a: undefined } });
      expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path');
    });

    it('should make request with defaults', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path');

      const lastCall = fetchMock.lastCall();

      expect(lastCall!.request!.credentials).toBe('same-origin');
      expect(lastCall![1]).toMatchObject({
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'kbn-version': 'VERSION',
          'x-elastic-internal-origin': 'Kibana',
        },
      });
    });

    it('should expose detailed response object when asResponse = true', async () => {
      fetchMock.get('*', { foo: 'bar' });

      const response = await fetchInstance.fetch('/my/path', { asResponse: true });

      expect(response.fetchOptions).toMatchObject({
        path: '/my/path',
        asResponse: true,
      });
      expect(response.request).toBeInstanceOf(Request);
      expect(response.response).toBeInstanceOf(Response);
      expect(response.body).toEqual({ foo: 'bar' });
    });

    it('should expose asSystemRequest: true on detailed response object when asResponse = true', async () => {
      fetchMock.get('*', { foo: 'bar' });

      const response = await fetchInstance.fetch('/my/path', {
        asResponse: true,
        asSystemRequest: true,
      });
      expect(response.fetchOptions.asSystemRequest).toBe(true);
    });

    it('should expose asSystemRequest: false on detailed response object when asResponse = true', async () => {
      fetchMock.get('*', { foo: 'bar' });

      const response = await fetchInstance.fetch('/my/path', {
        asResponse: true,
        asSystemRequest: false,
      });
      expect(response.fetchOptions.asSystemRequest).toBe(false);
    });

    it('should reject on network error', async () => {
      expect.assertions(1);
      fetchMock.get('*', { status: 500 });

      await expect(fetchInstance.fetch('/my/path')).rejects.toThrow(/Internal Server Error/);
    });

    it('should contain error message when throwing response', async () => {
      fetchMock.get('*', { status: 404, body: { foo: 'bar' } });

      await expect(fetchInstance.fetch('/my/path')).rejects.toMatchObject({
        message: 'Not Found',
        body: {
          foo: 'bar',
        },
        response: {
          status: 404,
          url: 'http://localhost/myBase/my/path',
        },
      });
    });

    it('preserves the name of the original error', async () => {
      expect.assertions(1);

      const abortError = new DOMException('The operation was aborted.', 'AbortError');

      fetchMock.get('*', Promise.reject(abortError));

      await fetchInstance.fetch('/my/path').catch((e) => {
        expect(e.name).toEqual('AbortError');
      });
    });

    it('exposes the request to the interceptors in case of aborted request', async () => {
      const responseErrorSpy = jest.fn();
      const abortError = new DOMException('The operation was aborted.', 'AbortError');

      fetchMock.get('*', Promise.reject(abortError));

      fetchInstance.intercept({
        responseError: responseErrorSpy,
      });

      await expect(fetchInstance.fetch('/my/path')).rejects.toThrow();

      expect(responseErrorSpy).toHaveBeenCalledTimes(1);
      const interceptedResponse = responseErrorSpy.mock.calls[0][0];

      expect(interceptedResponse.request).toEqual(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost/myBase/my/path',
        })
      );
      expect(interceptedResponse.error.name).toEqual('AbortError');
    });

    it('should support get() helper', async () => {
      fetchMock.get('*', {});
      await fetchInstance.get('/my/path', { method: 'POST' });

      expect(fetchMock.lastOptions()!.method).toBe('GET');
    });

    it('should support head() helper', async () => {
      fetchMock.head('*', {});
      await fetchInstance.head('/my/path', { method: 'GET' });

      expect(fetchMock.lastOptions()!.method).toBe('HEAD');
    });

    it('should support post() helper', async () => {
      fetchMock.post('*', {});
      await fetchInstance.post('/my/path', { method: 'GET', body: '{}' });

      expect(fetchMock.lastOptions()!.method).toBe('POST');
    });

    it('should support put() helper', async () => {
      fetchMock.put('*', {});
      await fetchInstance.put('/my/path', { method: 'GET', body: '{}' });

      expect(fetchMock.lastOptions()!.method).toBe('PUT');
    });

    it('should support patch() helper', async () => {
      fetchMock.patch('*', {});
      await fetchInstance.patch('/my/path', { method: 'GET', body: '{}' });

      expect(fetchMock.lastOptions()!.method).toBe('PATCH');
    });

    it('should support delete() helper', async () => {
      fetchMock.delete('*', {});
      await fetchInstance.delete('/my/path', { method: 'GET' });

      expect(fetchMock.lastOptions()!.method).toBe('DELETE');
    });

    it('should support options() helper', async () => {
      fetchMock.mock('*', { method: 'OPTIONS' });
      await fetchInstance.options('/my/path', { method: 'GET' });

      expect(fetchMock.lastOptions()!.method).toBe('OPTIONS');
    });

    it('should make requests for NDJSON content', async () => {
      const content = readFileSync(join(__dirname, '_import_objects.ndjson'), {
        encoding: 'utf-8',
      });
      const body = new FormData();

      body.append('file', content);
      fetchMock.post('*', {
        body: content,
        headers: { 'Content-Type': 'application/ndjson' },
      });

      const data = await fetchInstance.post<FormData>('/my/path', {
        body,
        headers: {
          'Content-Type': undefined,
        },
      });

      expect(data).toBeInstanceOf(Blob);

      const ndjson = await new Response(data).text();

      expect(ndjson).toEqual(content);
    });

    it('should pass through version as a header', async () => {
      fetchMock.get('*', { body: {} });
      await fetchInstance.fetch('/my/path', { asResponse: true, version: '99' });
      expect(fetchMock.lastOptions()!.headers).toEqual(
        expect.objectContaining({ [ELASTIC_HTTP_VERSION_HEADER.toLowerCase()]: '99' })
      );
    });
  });

  describe('interception', () => {
    beforeEach(async () => {
      fetchMock.get('*', { foo: 'bar' });
    });

    it('should make request and receive response', async () => {
      fetchInstance.intercept({});

      const body = await fetchInstance.fetch('/my/path');

      expect(fetchMock.called()).toBe(true);
      expect(body).toEqual({ foo: 'bar' });
    });

    it('should be able to manipulate request instance', async () => {
      fetchInstance.intercept({
        request(options) {
          return {
            headers: {
              ...options.headers,
              'Content-Type': 'CustomContentType',
            },
          };
        },
      });
      fetchInstance.intercept({
        request() {
          return { path: '/my/route' };
        },
      });

      const body = await fetchInstance.fetch('/my/path');

      expect(fetchMock.called()).toBe(true);
      expect(body).toEqual({ foo: 'bar' });
      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'content-type': 'CustomContentType',
      });
      expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/route');
    });

    it('should call interceptors in correct order', async () => {
      const order: string[] = [];

      fetchInstance.intercept({
        request() {
          order.push('Request 1');
        },
        response() {
          order.push('Response 1');
        },
      });
      fetchInstance.intercept({
        request() {
          order.push('Request 2');
        },
        response() {
          order.push('Response 2');
        },
      });
      fetchInstance.intercept({
        request() {
          order.push('Request 3');
        },
        response() {
          order.push('Response 3');
        },
      });

      const body = await fetchInstance.fetch('/my/path');

      expect(fetchMock.called()).toBe(true);
      expect(body).toEqual({ foo: 'bar' });
      expect(order).toEqual([
        'Request 3',
        'Request 2',
        'Request 1',
        'Response 1',
        'Response 2',
        'Response 3',
      ]);
    });

    it('should skip remaining interceptors when controller halts during request', async () => {
      const usedSpy = jest.fn();
      const unusedSpy = jest.fn();

      fetchInstance.intercept({ request: unusedSpy, response: unusedSpy });
      fetchInstance.intercept({
        request(request, controller) {
          controller.halt();
        },
        response: unusedSpy,
      });
      fetchInstance.intercept({
        request: usedSpy,
        response: unusedSpy,
      });

      fetchInstance.fetch('/my/path').then(unusedSpy, unusedSpy);
      await delay(1000);

      expect(unusedSpy).toHaveBeenCalledTimes(0);
      expect(usedSpy).toHaveBeenCalledTimes(1);
      expect(fetchMock.called()).toBe(false);
    });

    it('should skip remaining interceptors when controller halts during response', async () => {
      const usedSpy = jest.fn();
      const unusedSpy = jest.fn();

      fetchInstance.intercept({
        request: usedSpy,
        response(response, controller) {
          controller.halt();
        },
      });
      fetchInstance.intercept({ request: usedSpy, response: unusedSpy });
      fetchInstance.intercept({ request: usedSpy, response: unusedSpy });

      fetchInstance.fetch('/my/path').then(unusedSpy, unusedSpy);
      await delay(1000);

      expect(fetchMock.called()).toBe(true);
      expect(usedSpy).toHaveBeenCalledTimes(3);
      expect(unusedSpy).toHaveBeenCalledTimes(0);
    });

    it('should skip remaining interceptors when controller halts during responseError', async () => {
      fetchMock.post('*', 401);

      const unusedSpy = jest.fn();

      fetchInstance.intercept({
        responseError(response, controller) {
          controller.halt();
        },
      });
      fetchInstance.intercept({ response: unusedSpy, responseError: unusedSpy });

      fetchInstance.post('/my/path').then(unusedSpy, unusedSpy);
      await delay(1000);

      expect(fetchMock.called()).toBe(true);
      expect(unusedSpy).toHaveBeenCalledTimes(0);
    });

    it('should not fetch if exception occurs during request interception', async () => {
      const usedSpy = jest.fn();
      const unusedSpy = jest.fn();

      fetchInstance.intercept({
        request: unusedSpy,
        requestError: usedSpy,
        response: unusedSpy,
        responseError: unusedSpy,
      });
      fetchInstance.intercept({
        request() {
          throw new Error('Interception Error');
        },
        response: unusedSpy,
        responseError: unusedSpy,
      });
      fetchInstance.intercept({ request: usedSpy, response: unusedSpy, responseError: unusedSpy });

      await expect(fetchInstance.fetch('/my/path')).rejects.toThrow(/Interception Error/);
      expect(fetchMock.called()).toBe(false);
      expect(unusedSpy).toHaveBeenCalledTimes(0);
      expect(usedSpy).toHaveBeenCalledTimes(2);
    });

    it('should succeed if request throws but caught by interceptor', async () => {
      const usedSpy = jest.fn();
      const unusedSpy = jest.fn();

      fetchInstance.intercept({
        request: unusedSpy,
        requestError() {
          return { path: '/my/route' };
        },
        response: usedSpy,
      });
      fetchInstance.intercept({
        request() {
          throw new Error('Interception Error');
        },
        response: usedSpy,
      });
      fetchInstance.intercept({ request: usedSpy, response: usedSpy });

      await expect(fetchInstance.fetch('/my/route')).resolves.toEqual({ foo: 'bar' });
      expect(fetchMock.called()).toBe(true);
      expect(unusedSpy).toHaveBeenCalledTimes(0);
      expect(usedSpy).toHaveBeenCalledTimes(4);
    });

    it('should accumulate request information', async () => {
      const routes = ['alpha', 'beta', 'gamma'];
      const createRequest = jest.fn((options: HttpFetchOptionsWithPath) => ({
        path: `/api/${routes.shift()}`,
      }));

      fetchInstance.intercept({
        request: createRequest,
      });
      fetchInstance.intercept({
        requestError(httpErrorRequest) {
          return httpErrorRequest.fetchOptions;
        },
      });
      fetchInstance.intercept({
        request(request) {
          throw new Error('Invalid');
        },
      });
      fetchInstance.intercept({
        request: createRequest,
      });
      fetchInstance.intercept({
        request: createRequest,
      });

      await expect(fetchInstance.fetch('/my/route')).resolves.toEqual({ foo: 'bar' });
      expect(fetchMock.called()).toBe(true);
      expect(routes.length).toBe(0);
      expect(createRequest.mock.calls[0][0].path).toContain('/my/route');
      expect(createRequest.mock.calls[1][0].path).toContain('/api/alpha');
      expect(createRequest.mock.calls[2][0].path).toContain('/api/beta');
      expect(fetchMock.lastCall()!.request!.url).toContain('/api/gamma');
    });

    it('should accumulate response information', async () => {
      const bodies = ['alpha', 'beta', 'gamma'];
      const createResponse = jest.fn((httpResponse: HttpResponse) => ({
        body: bodies.shift(),
      }));

      fetchInstance.intercept({
        response: createResponse,
      });
      fetchInstance.intercept({
        response: createResponse,
      });
      fetchInstance.intercept({
        response(httpResponse) {
          throw new Error('Invalid');
        },
      });
      fetchInstance.intercept({
        responseError({ error, ...httpResponse }) {
          return httpResponse;
        },
      });
      fetchInstance.intercept({
        response: createResponse,
      });

      await expect(fetchInstance.fetch('/my/route')).resolves.toEqual('gamma');
      expect(fetchMock.called()).toBe(true);
      expect(bodies.length).toBe(0);
      expect(createResponse.mock.calls[0][0].body).toEqual({ foo: 'bar' });
      expect(createResponse.mock.calls[1][0].body).toBe('alpha');
      expect(createResponse.mock.calls[2][0].body).toBe('beta');
    });

    describe('request availability during interception', () => {
      it('should be available to responseError when response throws', async () => {
        let spiedRequest: Request | undefined;

        fetchInstance.intercept({
          response() {
            throw new Error('Internal Server Error');
          },
        });
        fetchInstance.intercept({
          responseError({ request }) {
            spiedRequest = request;
          },
        });

        await expect(fetchInstance.fetch('/my/path')).rejects.toThrow();
        expect(fetchMock.called()).toBe(true);
        expect(spiedRequest).toBeDefined();
      });
    });

    describe('response availability during interception', () => {
      it('should be available to responseError when network request fails', async () => {
        fetchMock.restore();
        fetchMock.get('*', { status: 500 });

        let spiedResponse: Response | undefined;

        fetchInstance.intercept({
          responseError({ response }) {
            spiedResponse = response;
          },
        });

        await expect(fetchInstance.fetch('/my/path')).rejects.toThrow();
        expect(spiedResponse).toBeDefined();
      });
    });

    it('should actually halt request interceptors in reverse order', async () => {
      const unusedSpy = jest.fn();

      fetchInstance.intercept({ request: unusedSpy });
      fetchInstance.intercept({
        request(request, controller) {
          controller.halt();
        },
      });

      fetchInstance.fetch('/my/path');
      await delay(500);

      expect(unusedSpy).toHaveBeenCalledTimes(0);
    });

    it('should recover from failing request interception via request error interceptor', async () => {
      const usedSpy = jest.fn();

      fetchInstance.intercept({
        requestError(httpErrorRequest) {
          return httpErrorRequest.fetchOptions;
        },
        response: usedSpy,
      });

      fetchInstance.intercept({
        request(request, controller) {
          throw new Error('Request Error');
        },
        response: usedSpy,
      });

      await expect(fetchInstance.fetch('/my/path')).resolves.toEqual({ foo: 'bar' });
      expect(usedSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('rawResponse', () => {
    it("throws if rawResponse is set to true but asResponse isn't", async () => {
      fetchMock.get('*', { foo: 'bar' });

      await expect(async () =>
        fetchInstance.fetch('/my/path', {
          rawResponse: true,
        })
      ).rejects.toThrowError(
        'Invalid fetch arguments, rawResponse = true is only supported when asResponse = true'
      );
    });

    it('immediately returns an unawaited Response object if rawResponse = true', async () => {
      fetchMock.get('*', { foo: 'bar' });

      const response = await fetchInstance.fetch('/my/path', {
        rawResponse: true,
        asResponse: true,
      });

      expect(response.response).toBeInstanceOf(Response);
      expect(response.body).toEqual(null);

      const body = await response.response?.json();

      expect(body).toEqual({ foo: 'bar' });
    });

    it('calls the request/response interceptors if rawResponse = true', async () => {
      fetchMock.get('*', { foo: 'bar' });

      const requestSpy = jest.fn();

      const responseSpy = jest.fn();

      fetchInstance.intercept({ request: requestSpy, response: responseSpy });

      await fetchInstance.fetch('/my/path', {
        rawResponse: true,
        asResponse: true,
      });

      expect(requestSpy).toHaveBeenCalled();

      expect(responseSpy).toHaveBeenCalled();
    });
  });
});
