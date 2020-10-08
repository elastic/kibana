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

import { CoreSetup } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';
import { IEsSearchRequest } from '../../common/search';
import { SearchInterceptor } from './search_interceptor';
import { AbortError } from '../../common';
import { SearchTimeoutError, PainlessError } from './errors';

let searchInterceptor: SearchInterceptor;
let mockCoreSetup: MockedKeys<CoreSetup>;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
jest.useFakeTimers();

describe('SearchInterceptor', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    searchInterceptor = new SearchInterceptor({
      toasts: mockCoreSetup.notifications.toasts,
      startServices: mockCoreSetup.getStartServices(),
      uiSettings: mockCoreSetup.uiSettings,
      http: mockCoreSetup.http,
    });
  });

  describe('search', () => {
    test('Observable should resolve if fetch is successful', async () => {
      const mockResponse: any = { result: 200 };
      mockCoreSetup.http.fetch.mockResolvedValueOnce(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      const result = await response.toPromise();
      expect(result).toBe(mockResponse);
    });

    test('Observable should fail if fetch has an internal error', async () => {
      const mockResponse: any = { result: 500, message: 'Internal Error' };
      mockCoreSetup.http.fetch.mockRejectedValueOnce(mockResponse);
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

    test('Should throw SearchTimeoutError on server timeout AND show toast', async (done) => {
      const mockResponse: any = {
        result: 500,
        body: {
          message: 'Request timed out',
        },
      };
      mockCoreSetup.http.fetch.mockRejectedValueOnce(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      try {
        await response.toPromise();
      } catch (e) {
        expect(e).toBeInstanceOf(SearchTimeoutError);
        expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(1);
        done();
      }
    });

    test('Search error should be debounced', async (done) => {
      const mockResponse: any = {
        result: 500,
        body: {
          message: 'Request timed out',
        },
      };
      mockCoreSetup.http.fetch.mockRejectedValue(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      try {
        await searchInterceptor.search(mockRequest).toPromise();
      } catch (e) {
        expect(e).toBeInstanceOf(SearchTimeoutError);
        try {
          await searchInterceptor.search(mockRequest).toPromise();
        } catch (e2) {
          expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(1);
          done();
        }
      }
    });

    test('Should throw Painless error on server error with OSS format', async (done) => {
      const mockResponse: any = {
        result: 500,
        body: {
          attributes: {
            error: {
              failed_shards: [
                {
                  reason: {
                    lang: 'painless',
                    script_stack: ['a', 'b'],
                    reason: 'banana',
                  },
                },
              ],
            },
          },
        },
      };
      mockCoreSetup.http.fetch.mockRejectedValueOnce(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);

      try {
        await response.toPromise();
      } catch (e) {
        expect(e).toBeInstanceOf(PainlessError);
        done();
      }
    });

    test('Observable should fail if user aborts (test merged signal)', async () => {
      const abortController = new AbortController();
      mockCoreSetup.http.fetch.mockImplementationOnce((options: any) => {
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
      const response = searchInterceptor.search(mockRequest, {
        abortSignal: abortController.signal,
      });

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

    test('Immediately aborts if passed an aborted abort signal', async (done) => {
      const abort = new AbortController();
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest, { abortSignal: abort.signal });
      abort.abort();

      const error = (e: any) => {
        expect(e).toBeInstanceOf(AbortError);
        expect(mockCoreSetup.http.fetch).not.toBeCalled();
        done();
      };
      response.subscribe({ error });
    });
  });
});
