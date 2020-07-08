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

import { CoreStart } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';
import { IEsSearchRequest } from '../../common/search';
import { SearchInterceptor } from './search_interceptor';
import { AbortError } from '../../common';

let searchInterceptor: SearchInterceptor;
let mockCoreStart: MockedKeys<CoreStart>;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
jest.useFakeTimers();

describe('SearchInterceptor', () => {
  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
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
    test('Observable should resolve if fetch is successful', async () => {
      const mockResponse: any = { result: 200 };
      mockCoreStart.http.fetch.mockResolvedValueOnce(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      const result = await response.toPromise();
      expect(result).toBe(mockResponse);
    });

    test('Observable should fail if fetch has an error', async () => {
      const mockResponse: any = { result: 500 };
      mockCoreStart.http.fetch.mockRejectedValueOnce(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      try {
        await response.toPromise();
      } catch (e) {
        expect(e).toBe(mockResponse);
      }
    });

    test('Observable should fail if fetch times out (test merged signal)', async () => {
      mockCoreStart.http.fetch.mockImplementationOnce((options: any) => {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new AbortError());
          });

          setTimeout(resolve, 5000);
        });
      });
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      const next = jest.fn();
      const error = (e: any) => {
        expect(next).not.toBeCalled();
        expect(e).toBeInstanceOf(AbortError);
      };
      response.subscribe({ next, error });

      jest.advanceTimersByTime(5000);

      await flushPromises();
    });

    test('Observable should fail if user aborts (test merged signal)', async () => {
      const abortController = new AbortController();
      mockCoreStart.http.fetch.mockImplementationOnce((options: any) => {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new AbortError());
          });

          setTimeout(resolve, 500);
        });
      });
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest, { signal: abortController.signal });

      const next = jest.fn();
      const error = (e: any) => {
        expect(next).not.toBeCalled();
        expect(e).toBeInstanceOf(AbortError);
      };
      response.subscribe({ next, error });
      setTimeout(() => abortController.abort(), 200);
      jest.advanceTimersByTime(5000);

      await flushPromises();
    });

    test('Immediatelly aborts if passed an aborted abort signal', async (done) => {
      const abort = new AbortController();
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest, { signal: abort.signal });
      abort.abort();

      const error = (e: any) => {
        expect(e).toBeInstanceOf(AbortError);
        expect(mockCoreStart.http.fetch).not.toBeCalled();
        done();
      };
      response.subscribe({ error });
    });
  });

  describe('getPendingCount$', () => {
    test('should observe the number of pending requests', () => {
      const pendingCount$ = searchInterceptor.getPendingCount$();
      const pendingNext = jest.fn();
      pendingCount$.subscribe(pendingNext);

      const mockResponse: any = { result: 200 };
      mockCoreStart.http.fetch.mockResolvedValue(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      response.subscribe({
        complete: () => {
          expect(pendingNext.mock.calls).toEqual([[0], [1], [0]]);
        },
      });
    });

    test('should observe the number of pending requests on error', () => {
      const pendingCount$ = searchInterceptor.getPendingCount$();
      const pendingNext = jest.fn();
      pendingCount$.subscribe(pendingNext);

      const mockResponse: any = { result: 500 };
      mockCoreStart.http.fetch.mockRejectedValue(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      response.subscribe({
        complete: () => {
          expect(pendingNext.mock.calls).toEqual([[0], [1], [0]]);
        },
      });
    });
  });
});
