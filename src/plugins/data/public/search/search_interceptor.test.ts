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

import { Observable, Subject, from, throwError } from 'rxjs';
import { CoreStart } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';
import { IEsSearchRequest, IEsSearchResponse } from '../../common/search';
import { RequestTimeoutError } from './request_timeout_error';
import { SearchInterceptor } from './search_interceptor';
import { AbortError } from '../../common';
import { delay, switchMap } from 'rxjs/operators';

jest.useFakeTimers();

const mockSearch = jest.fn();
let searchInterceptor: SearchInterceptor;
let mockCoreStart: MockedKeys<CoreStart>;

describe('SearchInterceptor', () => {
  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
    mockSearch.mockClear();
    searchInterceptor = new SearchInterceptor(
      {
        toasts: mockCoreStart.notifications.toasts,
        application: mockCoreStart.application,
        uiSettings: mockCoreStart.uiSettings,
        http: mockCoreStart.http,
      },
      1000
    );
  });

  describe('search', () => {
    test('should invoke `fetch` with the request', () => {
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);
      response.subscribe();
      const respArgs: any = mockCoreStart.http.fetch.mock.calls[0][0];
      expect(JSON.parse(respArgs.body)).toStrictEqual(mockRequest);
      expect(respArgs.method).toBe('POST');
    });

    test('Observable should resolve if fetch is successful', async (done) => {
      const mockResponse: any = { result: 200 };
      mockCoreStart.http.fetch.mockResolvedValue(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      const next = (result: IEsSearchResponse) => {
        expect(result).toBe(mockResponse);
        done();
      };
      response.subscribe({ next });
    });

    test('Observable should fail if fetch fails', async (done) => {
      const mockResponse: any = { result: 500 };
      mockCoreStart.http.fetch.mockRejectedValue(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      const error = (e: any) => {
        expect(e).toBe(mockResponse);
        done();
      };
      response.subscribe({ error });
    });

    test('Immediatelly aborts if passed an aborted abort signal', async (done) => {
      mockCoreStart.http.fetch.mockRejectedValue(new Observable());
      const abort = new AbortController();
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest, { signal: abort.signal });
      abort.abort();

      const error = (e: any) => {
        expect(e).toBeInstanceOf(AbortError);
        done();
      };
      response.subscribe({ error });
    });

    test('Aborts if signal is aborted', async (done) => {
      mockCoreStart.http.fetch.mockRejectedValue(new Observable());
      const abort = new AbortController();
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest, { signal: abort.signal });

      setTimeout(() => abort.abort(), 250);

      abort.abort();

      const error = (e: any) => {
        expect(e).toBeInstanceOf(AbortError);
        done();
      };
      response.subscribe({ error });
    });

    test('should return a `RequestTimeoutError` if the request times out', () => {
      mockCoreStart.http.fetch.mockResolvedValueOnce(new Observable());
      const response = searchInterceptor.search({
        params: {},
      });

      const error = jest.fn();
      response.subscribe({ error });

      jest.advanceTimersByTime(1000);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0] instanceof RequestTimeoutError).toBe(true);
    });
  });

  describe('getPendingCount$', () => {
    test('should observe the number of pending requests', () => {
      let i = 0;
      const mockResponses = [new Subject(), new Subject()];
      mockSearch.mockImplementation(() => mockResponses[i++]);

      const pendingCount$ = searchInterceptor.getPendingCount$();

      const next = jest.fn();
      pendingCount$.subscribe(next);

      const error = jest.fn();

      const delayedSuccess = from([{ result: 200 }]).pipe(delay(250));
      delayedSuccess.subscribe(() => {});

      const delayedError = from([{ result: 500 }]).pipe(
        delay(500),
        switchMap(() => throwError('error'))
      );

      mockCoreStart.http.fetch.mockResolvedValueOnce(delayedSuccess);
      searchInterceptor
        .search({
          params: {},
        })
        .subscribe({ error });
      mockCoreStart.http.fetch.mockResolvedValueOnce(delayedError);
      searchInterceptor
        .search({
          params: {},
        })
        .subscribe({ error });

      jest.advanceTimersByTime(500);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls).toEqual([[0], [1], [2], [1], [0]]);
    });
  });
});
