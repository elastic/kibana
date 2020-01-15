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

import { Fetch } from './fetch';
import { BasePath } from './base_path';
import { IHttpResponse } from './types';

function delay<T>(duration: number) {
  return new Promise<T>(r => setTimeout(r, duration));
}

describe('Fetch', () => {
  const fetchInstance = new Fetch({
    basePath: new BasePath('http://localhost/myBase'),
    kibanaVersion: 'VERSION',
  });
  afterEach(() => {
    fetchMock.restore();
  });

  describe('http requests', () => {
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

      expect(fetchMock.lastOptions()!.headers).toEqual({
        'content-type': 'application/json',
        'kbn-version': 'VERSION',
        myheader: 'foo',
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

      expect(response.request).toBeInstanceOf(Request);
      expect(response.response).toBeInstanceOf(Response);
      expect(response.body).toEqual({ foo: 'bar' });
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

    afterEach(() => {
      fetchMock.restore();
      fetchInstance.removeAllInterceptors();
    });

    it('should make request and receive response', async () => {
      fetchInstance.intercept({});

      const body = await fetchInstance.fetch('/my/path');

      expect(fetchMock.called()).toBe(true);
      expect(body).toEqual({ foo: 'bar' });
    });

    it('should be able to manipulate request instance', async () => {
      fetchInstance.intercept({
        request(request) {
          request.headers.set('Content-Type', 'CustomContentType');
        },
      });
      fetchInstance.intercept({
        request(request) {
          return new Request('/my/route', request);
        },
      });

      const body = await fetchInstance.fetch('/my/path');

      expect(fetchMock.called()).toBe(true);
      expect(body).toEqual({ foo: 'bar' });
      expect(fetchMock.lastOptions()!.headers).toMatchObject({
        'content-type': 'CustomContentType',
      });
      expect(fetchMock.lastUrl()).toBe('/my/route');
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
        requestError({ request }) {
          return new Request('/my/route', request);
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
      const createRequest = jest.fn(
        (request: Request) => new Request(`/api/${routes.shift()}`, request)
      );

      fetchInstance.intercept({
        request: createRequest,
      });
      fetchInstance.intercept({
        requestError(httpErrorRequest) {
          return httpErrorRequest.request;
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
      expect(createRequest.mock.calls[0][0].url).toContain('/my/route');
      expect(createRequest.mock.calls[1][0].url).toContain('/api/alpha');
      expect(createRequest.mock.calls[2][0].url).toContain('/api/beta');
      expect(fetchMock.lastCall()!.request.url).toContain('/api/gamma');
    });

    it('should accumulate response information', async () => {
      const bodies = ['alpha', 'beta', 'gamma'];
      const createResponse = jest.fn((httpResponse: IHttpResponse) => ({
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
          return httpErrorRequest.request;
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
