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

import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';
// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { setup, SetupTap } from '../../../test_utils/public/http_test_setup';
import { IHttpResponse } from './types';

function delay<T>(duration: number) {
  return new Promise<T>(r => setTimeout(r, duration));
}

const setupFakeBasePath: SetupTap = injectedMetadata => {
  injectedMetadata.getBasePath.mockReturnValue('/foo/bar');
};

describe('basePath.get()', () => {
  it('returns an empty string if no basePath is injected', () => {
    const { http } = setup(injectedMetadata => {
      injectedMetadata.getBasePath.mockReturnValue(undefined as any);
    });

    expect(http.basePath.get()).toBe('');
  });

  it('returns the injected basePath', () => {
    const { http } = setup(setupFakeBasePath);

    expect(http.basePath.get()).toBe('/foo/bar');
  });
});

describe('http requests', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('should use supplied request method', async () => {
    const { http } = setup();

    fetchMock.post('*', {});
    await http.fetch('/my/path', { method: 'POST' });

    expect(fetchMock.lastOptions()!.method).toBe('POST');
  });

  it('should use supplied Content-Type', async () => {
    const { http } = setup();

    fetchMock.get('*', {});
    await http.fetch('/my/path', { headers: { 'Content-Type': 'CustomContentType' } });

    expect(fetchMock.lastOptions()!.headers).toMatchObject({
      'content-type': 'CustomContentType',
    });
  });

  it('should use supplied pathname and querystring', async () => {
    const { http } = setup();

    fetchMock.get('*', {});
    await http.fetch('/my/path', { query: { a: 'b' } });

    expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path?a=b');
  });

  it('should use supplied headers', async () => {
    const { http } = setup();

    fetchMock.get('*', {});
    await http.fetch('/my/path', {
      headers: { myHeader: 'foo' },
    });

    expect(fetchMock.lastOptions()!.headers).toEqual({
      'content-type': 'application/json',
      'kbn-version': 'kibanaVersion',
      myheader: 'foo',
    });
  });

  it('should return response', async () => {
    const { http } = setup();
    fetchMock.get('*', { foo: 'bar' });
    const json = await http.fetch('/my/path');
    expect(json).toEqual({ foo: 'bar' });
  });

  it('should prepend url with basepath by default', async () => {
    const { http } = setup();
    fetchMock.get('*', {});
    await http.fetch('/my/path');
    expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path');
  });

  it('should not prepend url with basepath when disabled', async () => {
    const { http } = setup();
    fetchMock.get('*', {});
    await http.fetch('my/path', { prependBasePath: false });
    expect(fetchMock.lastUrl()).toBe('/my/path');
  });

  it('should not include undefined query params', async () => {
    const { http } = setup();
    fetchMock.get('*', {});
    await http.fetch('/my/path', { query: { a: undefined } });
    expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path');
  });

  it('should make request with defaults', async () => {
    const { http } = setup();

    fetchMock.get('*', {});
    await http.fetch('/my/path');

    const lastCall = fetchMock.lastCall();

    expect(lastCall!.request.credentials).toBe('same-origin');
    expect(lastCall![1]).toMatchObject({
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'kbn-version': 'kibanaVersion',
      },
    });
  });

  it('should expose detailed response object when asResponse = true', async () => {
    const { http } = setup();

    fetchMock.get('*', { foo: 'bar' });

    const response = await http.fetch('/my/path', { asResponse: true });

    expect(response.request).toBeInstanceOf(Request);
    expect(response.response).toBeInstanceOf(Response);
    expect(response.body).toEqual({ foo: 'bar' });
  });

  it('should reject on network error', async () => {
    const { http } = setup();

    expect.assertions(1);
    fetchMock.get('*', { status: 500 });

    await expect(http.fetch('/my/path')).rejects.toThrow(/Internal Server Error/);
  });

  it('should contain error message when throwing response', async () => {
    const { http } = setup();

    fetchMock.get('*', { status: 404, body: { foo: 'bar' } });

    await expect(http.fetch('/my/path')).rejects.toMatchObject({
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
    const { http } = setup();

    fetchMock.get('*', {});
    await http.get('/my/path', { method: 'POST' });

    expect(fetchMock.lastOptions()!.method).toBe('GET');
  });

  it('should support head() helper', async () => {
    const { http } = setup();

    fetchMock.head('*', {});
    await http.head('/my/path', { method: 'GET' });

    expect(fetchMock.lastOptions()!.method).toBe('HEAD');
  });

  it('should support post() helper', async () => {
    const { http } = setup();

    fetchMock.post('*', {});
    await http.post('/my/path', { method: 'GET', body: '{}' });

    expect(fetchMock.lastOptions()!.method).toBe('POST');
  });

  it('should support put() helper', async () => {
    const { http } = setup();

    fetchMock.put('*', {});
    await http.put('/my/path', { method: 'GET', body: '{}' });

    expect(fetchMock.lastOptions()!.method).toBe('PUT');
  });

  it('should support patch() helper', async () => {
    const { http } = setup();

    fetchMock.patch('*', {});
    await http.patch('/my/path', { method: 'GET', body: '{}' });

    expect(fetchMock.lastOptions()!.method).toBe('PATCH');
  });

  it('should support delete() helper', async () => {
    const { http } = setup();

    fetchMock.delete('*', {});
    await http.delete('/my/path', { method: 'GET' });

    expect(fetchMock.lastOptions()!.method).toBe('DELETE');
  });

  it('should support options() helper', async () => {
    const { http } = setup();

    fetchMock.mock('*', { method: 'OPTIONS' });
    await http.options('/my/path', { method: 'GET' });

    expect(fetchMock.lastOptions()!.method).toBe('OPTIONS');
  });

  it('should make requests for NDJSON content', async () => {
    const { http } = setup();
    const content = readFileSync(join(__dirname, '_import_objects.ndjson'), { encoding: 'utf-8' });
    const body = new FormData();

    body.append('file', content);
    fetchMock.post('*', {
      body: content,
      headers: { 'Content-Type': 'application/ndjson' },
    });

    const data = await http.post('/my/path', {
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
  const { http } = setup();

  beforeEach(() => {
    fetchMock.get('*', { foo: 'bar' });
  });

  afterEach(() => {
    fetchMock.restore();
    http.removeAllInterceptors();
  });

  it('should make request and receive response', async () => {
    http.intercept({});

    const body = await http.fetch('/my/path');

    expect(fetchMock.called()).toBe(true);
    expect(body).toEqual({ foo: 'bar' });
  });

  it('should be able to manipulate request instance', async () => {
    http.intercept({
      request(request) {
        request.headers.set('Content-Type', 'CustomContentType');
      },
    });
    http.intercept({
      request(request) {
        return new Request('/my/route', request);
      },
    });

    const body = await http.fetch('/my/path');

    expect(fetchMock.called()).toBe(true);
    expect(body).toEqual({ foo: 'bar' });
    expect(fetchMock.lastOptions()!.headers).toMatchObject({
      'content-type': 'CustomContentType',
    });
    expect(fetchMock.lastUrl()).toBe('/my/route');
  });

  it('should call interceptors in correct order', async () => {
    const order: string[] = [];

    http.intercept({
      request() {
        order.push('Request 1');
      },
      response() {
        order.push('Response 1');
      },
    });
    http.intercept({
      request() {
        order.push('Request 2');
      },
      response() {
        order.push('Response 2');
      },
    });
    http.intercept({
      request() {
        order.push('Request 3');
      },
      response() {
        order.push('Response 3');
      },
    });

    const body = await http.fetch('/my/path');

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

    http.intercept({ request: unusedSpy, response: unusedSpy });
    http.intercept({
      request(request, controller) {
        controller.halt();
      },
      response: unusedSpy,
    });
    http.intercept({
      request: usedSpy,
      response: unusedSpy,
    });

    http.fetch('/my/path').then(unusedSpy, unusedSpy);
    await delay(1000);

    expect(unusedSpy).toHaveBeenCalledTimes(0);
    expect(usedSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock.called()).toBe(false);
  });

  it('should skip remaining interceptors when controller halts during response', async () => {
    const usedSpy = jest.fn();
    const unusedSpy = jest.fn();

    http.intercept({
      request: usedSpy,
      response(response, controller) {
        controller.halt();
      },
    });
    http.intercept({ request: usedSpy, response: unusedSpy });
    http.intercept({ request: usedSpy, response: unusedSpy });

    http.fetch('/my/path').then(unusedSpy, unusedSpy);
    await delay(1000);

    expect(fetchMock.called()).toBe(true);
    expect(usedSpy).toHaveBeenCalledTimes(3);
    expect(unusedSpy).toHaveBeenCalledTimes(0);
  });

  it('should skip remaining interceptors when controller halts during responseError', async () => {
    fetchMock.post('*', 401);

    const unusedSpy = jest.fn();

    http.intercept({
      responseError(response, controller) {
        controller.halt();
      },
    });
    http.intercept({ response: unusedSpy, responseError: unusedSpy });

    http.post('/my/path').then(unusedSpy, unusedSpy);
    await delay(1000);

    expect(fetchMock.called()).toBe(true);
    expect(unusedSpy).toHaveBeenCalledTimes(0);
  });

  it('should not fetch if exception occurs during request interception', async () => {
    const usedSpy = jest.fn();
    const unusedSpy = jest.fn();

    http.intercept({
      request: unusedSpy,
      requestError: usedSpy,
      response: unusedSpy,
      responseError: unusedSpy,
    });
    http.intercept({
      request() {
        throw new Error('Interception Error');
      },
      response: unusedSpy,
      responseError: unusedSpy,
    });
    http.intercept({ request: usedSpy, response: unusedSpy, responseError: unusedSpy });

    await expect(http.fetch('/my/path')).rejects.toThrow(/Interception Error/);
    expect(fetchMock.called()).toBe(false);
    expect(unusedSpy).toHaveBeenCalledTimes(0);
    expect(usedSpy).toHaveBeenCalledTimes(2);
  });

  it('should succeed if request throws but caught by interceptor', async () => {
    const usedSpy = jest.fn();
    const unusedSpy = jest.fn();

    http.intercept({
      request: unusedSpy,
      requestError({ request }) {
        return new Request('/my/route', request);
      },
      response: usedSpy,
    });
    http.intercept({
      request() {
        throw new Error('Interception Error');
      },
      response: usedSpy,
    });
    http.intercept({ request: usedSpy, response: usedSpy });

    await expect(http.fetch('/my/route')).resolves.toEqual({ foo: 'bar' });
    expect(fetchMock.called()).toBe(true);
    expect(unusedSpy).toHaveBeenCalledTimes(0);
    expect(usedSpy).toHaveBeenCalledTimes(4);
  });

  it('should accumulate request information', async () => {
    const routes = ['alpha', 'beta', 'gamma'];
    const createRequest = jest.fn(
      (request: Request) => new Request(`/api/${routes.shift()}`, request)
    );

    http.intercept({
      request: createRequest,
    });
    http.intercept({
      requestError(httpErrorRequest) {
        return httpErrorRequest.request;
      },
    });
    http.intercept({
      request(request) {
        throw new Error('Invalid');
      },
    });
    http.intercept({
      request: createRequest,
    });
    http.intercept({
      request: createRequest,
    });

    await expect(http.fetch('/my/route')).resolves.toEqual({ foo: 'bar' });
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

    http.intercept({
      response: createResponse,
    });
    http.intercept({
      response: createResponse,
    });
    http.intercept({
      response(httpResponse) {
        throw new Error('Invalid');
      },
    });
    http.intercept({
      responseError({ error, ...httpResponse }) {
        return httpResponse;
      },
    });
    http.intercept({
      response: createResponse,
    });

    await expect(http.fetch('/my/route')).resolves.toEqual('gamma');
    expect(fetchMock.called()).toBe(true);
    expect(bodies.length).toBe(0);
    expect(createResponse.mock.calls[0][0].body).toEqual({ foo: 'bar' });
    expect(createResponse.mock.calls[1][0].body).toBe('alpha');
    expect(createResponse.mock.calls[2][0].body).toBe('beta');
  });

  describe('request availability during interception', () => {
    it('should be available to responseError when response throws', async () => {
      let spiedRequest: Request | undefined;

      http.intercept({
        response() {
          throw new Error('Internal Server Error');
        },
      });
      http.intercept({
        responseError({ request }) {
          spiedRequest = request;
        },
      });

      await expect(http.fetch('/my/path')).rejects.toThrow();
      expect(fetchMock.called()).toBe(true);
      expect(spiedRequest).toBeDefined();
    });
  });

  describe('response availability during interception', () => {
    it('should be available to responseError when network request fails', async () => {
      fetchMock.restore();
      fetchMock.get('*', { status: 500 });

      let spiedResponse: Response | undefined;

      http.intercept({
        responseError({ response }) {
          spiedResponse = response;
        },
      });

      await expect(http.fetch('/my/path')).rejects.toThrow();
      expect(spiedResponse).toBeDefined();
    });
  });

  it('should actually halt request interceptors in reverse order', async () => {
    const unusedSpy = jest.fn();

    http.intercept({ request: unusedSpy });
    http.intercept({
      request(request, controller) {
        controller.halt();
      },
    });

    http.fetch('/my/path');
    await delay(500);

    expect(unusedSpy).toHaveBeenCalledTimes(0);
  });

  it('should recover from failing request interception via request error interceptor', async () => {
    const usedSpy = jest.fn();

    http.intercept({
      requestError(httpErrorRequest) {
        return httpErrorRequest.request;
      },
      response: usedSpy,
    });

    http.intercept({
      request(request, controller) {
        throw new Error('Request Error');
      },
      response: usedSpy,
    });

    await expect(http.fetch('/my/path')).resolves.toEqual({ foo: 'bar' });
    expect(usedSpy).toHaveBeenCalledTimes(2);
  });
});

describe('addLoadingCount()', () => {
  it('subscribes to passed in sources, unsubscribes on stop', () => {
    const { httpService, http } = setup();

    const unsubA = jest.fn();
    const subA = jest.fn().mockReturnValue(unsubA);
    http.addLoadingCount(new Rx.Observable(subA));
    expect(subA).toHaveBeenCalledTimes(1);
    expect(unsubA).not.toHaveBeenCalled();

    const unsubB = jest.fn();
    const subB = jest.fn().mockReturnValue(unsubB);
    http.addLoadingCount(new Rx.Observable(subB));
    expect(subB).toHaveBeenCalledTimes(1);
    expect(unsubB).not.toHaveBeenCalled();

    httpService.stop();

    expect(subA).toHaveBeenCalledTimes(1);
    expect(unsubA).toHaveBeenCalledTimes(1);
    expect(subB).toHaveBeenCalledTimes(1);
    expect(unsubB).toHaveBeenCalledTimes(1);
  });

  it('adds a fatal error if source observables emit an error', async () => {
    const { http, fatalErrors } = setup();

    http.addLoadingCount(Rx.throwError(new Error('foo bar')));
    expect(fatalErrors.add.mock.calls).toMatchSnapshot();
  });

  it('adds a fatal error if source observable emits a negative number', async () => {
    const { http, fatalErrors } = setup();

    http.addLoadingCount(Rx.of(1, 2, 3, 4, -9));
    expect(fatalErrors.add.mock.calls).toMatchSnapshot();
  });
});

describe('getLoadingCount$()', () => {
  it('emits 0 initially, the right count when sources emit their own count, and ends with zero', async () => {
    const { httpService, http } = setup();

    const countA$ = new Rx.Subject<number>();
    const countB$ = new Rx.Subject<number>();
    const countC$ = new Rx.Subject<number>();
    const promise = http
      .getLoadingCount$()
      .pipe(toArray())
      .toPromise();

    http.addLoadingCount(countA$);
    http.addLoadingCount(countB$);
    http.addLoadingCount(countC$);

    countA$.next(100);
    countB$.next(10);
    countC$.next(1);
    countA$.complete();
    countB$.next(20);
    countC$.complete();
    countB$.next(0);

    httpService.stop();
    expect(await promise).toMatchSnapshot();
  });

  it('only emits when loading count changes', async () => {
    const { httpService, http } = setup();

    const count$ = new Rx.Subject<number>();
    const promise = http
      .getLoadingCount$()
      .pipe(toArray())
      .toPromise();

    http.addLoadingCount(count$);
    count$.next(0);
    count$.next(0);
    count$.next(0);
    count$.next(0);
    count$.next(0);
    count$.next(1);
    count$.next(1);
    httpService.stop();

    expect(await promise).toMatchSnapshot();
  });
});
