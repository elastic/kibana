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

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { first } from 'rxjs/operators';

import { Fetch } from './fetch';
import { BasePath } from './base_path';
import { HttpResponse, HttpFetchOptionsWithPath } from './types';

function delay<T>(duration: number) {
  return new Promise<T>((r) => setTimeout(r, duration));
}

const BASE_PATH = 'http://localhost/myBase';

describe('Fetch', () => {
  const fetchInstance = new Fetch({
    basePath: new BasePath(BASE_PATH),
    kibanaVersion: 'VERSION',
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
          // @ts-ignore
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
        myheader: 'foo',
      });
    });

    it('should not allow overwriting of kbn-version header', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: { myHeader: 'foo', 'kbn-version': 'CUSTOM!' },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"kbn-\\" are not allowed: [kbn-version]"`
      );
    });

    it('should not set kbn-system-request header by default', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', {
        headers: { myHeader: 'foo' },
      });

      expect(fetchMock.lastOptions()!.headers['kbn-system-request']).toBeUndefined();
    });

    it('should not set kbn-system-request header when asSystemRequest: false', async () => {
      fetchMock.get('*', {});
      await fetchInstance.fetch('/my/path', {
        headers: { myHeader: 'foo' },
        asSystemRequest: false,
      });

      expect(fetchMock.lastOptions()!.headers['kbn-system-request']).toBeUndefined();
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

    // Deprecated header used by legacy platform pre-7.7. Remove in 8.x.
    it('should not allow overwriting of kbn-system-api when asSystemRequest: true', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: { myHeader: 'foo', 'kbn-system-api': 'ANOTHER!' },
          asSystemRequest: true,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"kbn-\\" are not allowed: [kbn-system-api]"`
      );
    });

    // Deprecated header used by legacy platform pre-7.7. Remove in 8.x.
    it('should not allow overwriting of kbn-system-api when asSystemRequest: false', async () => {
      fetchMock.get('*', {});
      await expect(
        fetchInstance.fetch('/my/path', {
          headers: { myHeader: 'foo', 'kbn-system-api': 'ANOTHER!' },
          asSystemRequest: false,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid fetch headers, headers beginning with \\"kbn-\\" are not allowed: [kbn-system-api]"`
      );
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

      expect(lastCall!.request.credentials).toBe('same-origin');
      expect(lastCall![1]).toMatchObject({
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'kbn-version': 'VERSION',
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

      const data = await fetchInstance.post('/my/path', {
        body,
        headers: {
          'Content-Type': undefined,
        },
      });

      expect(data).toBeInstanceOf(Blob);

      const ndjson = await new Response(data).text();

      expect(ndjson).toEqual(content);
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
      expect(fetchMock.lastCall()!.request.url).toContain('/api/gamma');
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
});
