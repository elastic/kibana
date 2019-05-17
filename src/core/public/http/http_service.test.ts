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

import { BasePathService } from '../base_path/base_path_service';
import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { HttpService } from './http_service';
import { readFileSync } from 'fs';
import { join } from 'path';

function setupService() {
  const httpService = new HttpService();
  const fatalErrors = fatalErrorsServiceMock.createSetupContract();
  const injectedMetadata = injectedMetadataServiceMock.createSetupContract();

  injectedMetadata.getBasePath.mockReturnValueOnce('http://localhost/myBase');

  const basePath = new BasePathService().setup({ injectedMetadata });
  const http = httpService.setup({ basePath, fatalErrors, injectedMetadata });

  return { httpService, fatalErrors, http };
}

describe('http requests', async () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('should use supplied request method', async () => {
    const { http } = setupService();

    fetchMock.post('*', {});
    await http.fetch('/my/path', { method: 'POST' });

    expect(fetchMock.lastOptions()!.method).toBe('POST');
  });

  it('should use supplied Content-Type', async () => {
    const { http } = setupService();

    fetchMock.get('*', {});
    await http.fetch('/my/path', { headers: { 'Content-Type': 'CustomContentType' } });

    expect(fetchMock.lastOptions()!.headers).toMatchObject({
      'Content-Type': 'CustomContentType',
    });
  });

  it('should use supplied pathname and querystring', async () => {
    const { http } = setupService();

    fetchMock.get('*', {});
    await http.fetch('/my/path', { query: { a: 'b' } });

    expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path?a=b');
  });

  it('should use supplied headers', async () => {
    const { http } = setupService();

    fetchMock.get('*', {});
    await http.fetch('/my/path', {
      headers: { myHeader: 'foo' },
    });

    expect(fetchMock.lastOptions()!.headers).toEqual({
      'Content-Type': 'application/json',
      'kbn-version': 'kibanaVersion',
      myHeader: 'foo',
    });
  });

  it('should return response', async () => {
    const { http } = setupService();

    fetchMock.get('*', { foo: 'bar' });

    const json = await http.fetch('/my/path');

    expect(json).toEqual({ foo: 'bar' });
  });

  it('should prepend url with basepath by default', async () => {
    const { http } = setupService();

    fetchMock.get('*', {});
    await http.fetch('/my/path');

    expect(fetchMock.lastUrl()).toBe('http://localhost/myBase/my/path');
  });

  it('should not prepend url with basepath when disabled', async () => {
    const { http } = setupService();

    fetchMock.get('*', {});
    await http.fetch('my/path', { prependBasePath: false });

    expect(fetchMock.lastUrl()).toBe('/my/path');
  });

  it('should make request with defaults', async () => {
    const { http } = setupService();

    fetchMock.get('*', {});
    await http.fetch('/my/path');

    expect(fetchMock.lastOptions()!).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': 'kibanaVersion',
      },
    });
  });

  it('should reject on network error', async () => {
    const { http } = setupService();

    expect.assertions(1);
    fetchMock.get('*', { status: 500 });

    await expect(http.fetch('/my/path')).rejects.toThrow(/Internal Server Error/);
  });

  it('should contain error message when throwing response', async () => {
    const { http } = setupService();

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
    const { http } = setupService();

    fetchMock.get('*', {});
    await http.get('/my/path', { method: 'POST' });

    expect(fetchMock.lastOptions()!.method).toBe('GET');
  });

  it('should support head() helper', async () => {
    const { http } = setupService();

    fetchMock.head('*', {});
    await http.head('/my/path', { method: 'GET' });

    expect(fetchMock.lastOptions()!.method).toBe('HEAD');
  });

  it('should support post() helper', async () => {
    const { http } = setupService();

    fetchMock.post('*', {});
    await http.post('/my/path', { method: 'GET', body: '{}' });

    expect(fetchMock.lastOptions()!.method).toBe('POST');
  });

  it('should support put() helper', async () => {
    const { http } = setupService();

    fetchMock.put('*', {});
    await http.put('/my/path', { method: 'GET', body: '{}' });

    expect(fetchMock.lastOptions()!.method).toBe('PUT');
  });

  it('should support patch() helper', async () => {
    const { http } = setupService();

    fetchMock.patch('*', {});
    await http.patch('/my/path', { method: 'GET', body: '{}' });

    expect(fetchMock.lastOptions()!.method).toBe('PATCH');
  });

  it('should support delete() helper', async () => {
    const { http } = setupService();

    fetchMock.delete('*', {});
    await http.delete('/my/path', { method: 'GET' });

    expect(fetchMock.lastOptions()!.method).toBe('DELETE');
  });

  it('should support options() helper', async () => {
    const { http } = setupService();

    fetchMock.mock('*', { method: 'OPTIONS' });
    await http.options('/my/path', { method: 'GET' });

    expect(fetchMock.lastOptions()!.method).toBe('OPTIONS');
  });

  it('should make requests for NDJSON content', async () => {
    const { http } = setupService();
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

describe('addLoadingCount()', async () => {
  it('subscribes to passed in sources, unsubscribes on stop', () => {
    const { httpService, http } = setupService();

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
    const { http, fatalErrors } = setupService();

    http.addLoadingCount(Rx.throwError(new Error('foo bar')));
    expect(fatalErrors.add.mock.calls).toMatchSnapshot();
  });

  it('adds a fatal error if source observable emits a negative number', async () => {
    const { http, fatalErrors } = setupService();

    http.addLoadingCount(Rx.of(1, 2, 3, 4, -9));
    expect(fatalErrors.add.mock.calls).toMatchSnapshot();
  });
});

describe('getLoadingCount$()', async () => {
  it('emits 0 initially, the right count when sources emit their own count, and ends with zero', async () => {
    const { httpService, http } = setupService();

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
    const { httpService, http } = setupService();

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
