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
import { ISearchStart, ISessionService } from '.';
import { bfetchPluginMock } from '../../../bfetch/public/mocks';
import { BfetchPublicSetup } from 'src/plugins/bfetch/public';

let searchInterceptor: SearchInterceptor;
let mockCoreSetup: MockedKeys<CoreSetup>;
let bfetchSetup: jest.Mocked<BfetchPublicSetup>;
let fetchMock: jest.Mock<any>;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
jest.useFakeTimers();

describe('SearchInterceptor', () => {
  let searchMock: jest.Mocked<ISearchStart>;
  let mockCoreStart: MockedKeys<CoreStart>;
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    searchMock = searchServiceMock.createStartContract();
    fetchMock = jest.fn();
    bfetchSetup = bfetchPluginMock.createSetupContract();
    bfetchSetup.batchedFunction.mockReturnValue(fetchMock);
    searchInterceptor = new SearchInterceptor({
      bfetch: bfetchSetup,
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
        new PainlessError({
          body: {
            attributes: {
              error: {
                failed_shards: {
                  reason: 'bananas',
                },
              },
            },
          } as any,
        })
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
      fetchMock.mockResolvedValueOnce(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);
      await expect(response.toPromise()).resolves.toBe(mockResponse);
    });

    describe('Search session', () => {
      const setup = ({
        isRestore = false,
        isStored = false,
        sessionId,
      }: {
        isRestore?: boolean;
        isStored?: boolean;
        sessionId?: string;
      }) => {
        const sessionServiceMock = searchMock.session as jest.Mocked<ISessionService>;
        sessionServiceMock.getSessionId.mockImplementation(() => sessionId);
        sessionServiceMock.isRestore.mockImplementation(() => isRestore);
        sessionServiceMock.isStored.mockImplementation(() => isStored);
        fetchMock.mockResolvedValue({ result: 200 });
      };

      const mockRequest: IEsSearchRequest = {
        params: {},
      };

      afterEach(() => {
        const sessionServiceMock = searchMock.session as jest.Mocked<ISessionService>;
        sessionServiceMock.getSessionId.mockReset();
        sessionServiceMock.isRestore.mockReset();
        sessionServiceMock.isStored.mockReset();
        fetchMock.mockReset();
      });

      test('infers isRestore from session service state', async () => {
        const sessionId = 'sid';
        setup({
          isRestore: true,
          sessionId,
        });

        await searchInterceptor.search(mockRequest, { sessionId }).toPromise();
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            options: { sessionId: 'sid', isStored: false, isRestore: true },
          })
        );
      });

      test('infers isStored from session service state', async () => {
        const sessionId = 'sid';
        setup({
          isStored: true,
          sessionId,
        });

        await searchInterceptor.search(mockRequest, { sessionId }).toPromise();
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            options: { sessionId: 'sid', isStored: true, isRestore: false },
          })
        );
      });

      test('skips isRestore & isStore in case not a current session Id', async () => {
        setup({
          isStored: true,
          isRestore: true,
          sessionId: 'session id',
        });

        await searchInterceptor
          .search(mockRequest, { sessionId: 'different session id' })
          .toPromise();
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            options: { sessionId: 'different session id', isStored: false, isRestore: false },
          })
        );
      });

      test('skips isRestore & isStore in case no session Id', async () => {
        setup({
          isStored: true,
          isRestore: true,
          sessionId: undefined,
        });

        await searchInterceptor.search(mockRequest, { sessionId: 'sessionId' }).toPromise();
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            options: { sessionId: 'sessionId', isStored: false, isRestore: false },
          })
        );
      });
    });

    describe('Should throw typed errors', () => {
      test('Observable should fail if fetch has an internal error', async () => {
        const mockResponse: any = new Error('Internal Error');
        fetchMock.mockRejectedValue(mockResponse);
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
          fetchMock.mockRejectedValueOnce(mockResponse);
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
          fetchMock.mockRejectedValue(mockResponse);
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
          fetchMock.mockRejectedValue(mockResponse);
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
          fetchMock.mockRejectedValue(mockResponse);
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
        fetchMock.mockRejectedValueOnce(mockResponse);
        const mockRequest: IEsSearchRequest = {
          params: {},
        };
        const response = searchInterceptor.search(mockRequest);
        await expect(response.toPromise()).rejects.toThrow(PainlessError);
      });

      test('Observable should fail if user aborts (test merged signal)', async () => {
        const abortController = new AbortController();
        fetchMock.mockImplementationOnce((options: any) => {
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
          expect(fetchMock).not.toBeCalled();
          done();
        };
        response.subscribe({ error });
      });
    });
  });
});
