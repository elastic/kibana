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
import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';
import { IEsSearchRequest } from '../../common/search';
import { SearchInterceptor } from './search_interceptor';
import { AbortError } from '../../../kibana_utils/public';
import { SearchTimeoutError, PainlessError, TimeoutErrorMode } from './errors';
import { searchServiceMock } from './mocks';
import { ISearchStart } from '.';

let searchInterceptor: SearchInterceptor;
let mockCoreSetup: MockedKeys<CoreSetup>;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
jest.useFakeTimers();

describe('SearchInterceptor', () => {
  let searchMock: jest.Mocked<ISearchStart>;
  let mockCoreStart: MockedKeys<CoreStart>;
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    searchMock = searchServiceMock.createStartContract();
    searchInterceptor = new SearchInterceptor({
      toasts: mockCoreSetup.notifications.toasts,
      startServices: new Promise((resolve) => {
        resolve([mockCoreStart, {}, {}]);
      }),
      uiSettings: mockCoreSetup.uiSettings,
      http: mockCoreSetup.http,
      session: searchMock.session,
    });
  });

  describe('showError', () => {
    test('Ignores an AbortError', async () => {
      searchInterceptor.showError(new AbortError());
      expect(mockCoreSetup.notifications.toasts.addDanger).not.toBeCalled();
      expect(mockCoreSetup.notifications.toasts.addError).not.toBeCalled();
    });

    test('Ignores a SearchTimeoutError', async () => {
      searchInterceptor.showError(new SearchTimeoutError(new Error(), TimeoutErrorMode.UPGRADE));
      expect(mockCoreSetup.notifications.toasts.addDanger).not.toBeCalled();
      expect(mockCoreSetup.notifications.toasts.addError).not.toBeCalled();
    });

    test('Renders a PainlessError', async () => {
      searchInterceptor.showError(
        new PainlessError(
          {
            body: {
              attributes: {
                error: {
                  failed_shards: {
                    reason: 'bananas',
                  },
                },
              },
            } as any,
          },
          {} as any
        )
      );
      expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(1);
      expect(mockCoreSetup.notifications.toasts.addError).not.toBeCalled();
    });

    test('Renders a general error', async () => {
      searchInterceptor.showError(new Error('Oopsy'));
      expect(mockCoreSetup.notifications.toasts.addDanger).not.toBeCalled();
      expect(mockCoreSetup.notifications.toasts.addError).toBeCalledTimes(1);
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
      expect(response.toPromise()).resolves.toBe(mockResponse);
    });

    describe('Should throw typed errors', () => {
      test('Observable should fail if fetch has an internal error', async () => {
        const mockResponse: any = new Error('Internal Error');
        mockCoreSetup.http.fetch.mockRejectedValue(mockResponse);
        const mockRequest: IEsSearchRequest = {
          params: {},
        };
        const response = searchInterceptor.search(mockRequest);
        await expect(response.toPromise()).rejects.toThrow('Internal Error');
      });

      describe('Should handle Timeout errors', () => {
        test('Should throw SearchTimeoutError on server timeout AND show toast', async () => {
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
          await expect(response.toPromise()).rejects.toThrow(SearchTimeoutError);
          expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(1);
        });

        test('Timeout error should show multiple times if not in a session', async () => {
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

          await expect(searchInterceptor.search(mockRequest).toPromise()).rejects.toThrow(
            SearchTimeoutError
          );
          await expect(searchInterceptor.search(mockRequest).toPromise()).rejects.toThrow(
            SearchTimeoutError
          );
          expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(2);
        });

        test('Timeout error should show once per each session', async () => {
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

          await expect(
            searchInterceptor.search(mockRequest, { sessionId: 'abc' }).toPromise()
          ).rejects.toThrow(SearchTimeoutError);
          await expect(
            searchInterceptor.search(mockRequest, { sessionId: 'def' }).toPromise()
          ).rejects.toThrow(SearchTimeoutError);
          expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(2);
        });

        test('Timeout error should show once in a single session', async () => {
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
          await expect(
            searchInterceptor.search(mockRequest, { sessionId: 'abc' }).toPromise()
          ).rejects.toThrow(SearchTimeoutError);
          await expect(
            searchInterceptor.search(mockRequest, { sessionId: 'abc' }).toPromise()
          ).rejects.toThrow(SearchTimeoutError);
          expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(1);
        });
      });

      test('Should throw Painless error on server error with OSS format', async () => {
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
        await expect(response.toPromise()).rejects.toThrow(PainlessError);
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

      test('Immediately aborts if passed an aborted abort signal', async () => {
        const abort = new AbortController();
        const mockRequest: IEsSearchRequest = {
          params: {},
        };
        const response = searchInterceptor.search(mockRequest, { abortSignal: abort.signal });
        abort.abort();

        const error = (e: any) => {
          expect(e).toBeInstanceOf(AbortError);
          expect(mockCoreSetup.http.fetch).not.toBeCalled();
        };
        response.subscribe({ error });
      });
    });
  });
});
