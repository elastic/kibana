/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';
import { IEsSearchRequest } from '../../common/search';
import { SearchInterceptor } from './search_interceptor';
import { AbortError } from '../../../kibana_utils/public';
import { SearchTimeoutError, PainlessError, TimeoutErrorMode, EsError } from './errors';
import { searchServiceMock } from './mocks';
import { ISearchStart, ISessionService } from '.';
import { bfetchPluginMock } from '../../../bfetch/public/mocks';
import { BfetchPublicSetup } from 'src/plugins/bfetch/public';

import * as searchPhaseException from '../../common/search/test_data/search_phase_execution_exception.json';
import * as resourceNotFoundException from '../../common/search/test_data/resource_not_found_exception.json';

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
          statusCode: 400,
          message: 'search_phase_execution_exception',
          attributes: searchPhaseException.error,
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
      const setup = (
        opts: {
          isRestore?: boolean;
          isStored?: boolean;
          sessionId: string;
        } | null
      ) => {
        const sessionServiceMock = searchMock.session as jest.Mocked<ISessionService>;
        sessionServiceMock.getSearchOptions.mockImplementation(() =>
          opts
            ? {
                sessionId: opts.sessionId,
                isRestore: opts.isRestore ?? false,
                isStored: opts.isStored ?? false,
              }
            : null
        );
        fetchMock.mockResolvedValue({ result: 200 });
      };

      const mockRequest: IEsSearchRequest = {
        params: {},
      };

      afterEach(() => {
        const sessionServiceMock = searchMock.session as jest.Mocked<ISessionService>;
        sessionServiceMock.getSearchOptions.mockReset();
        fetchMock.mockReset();
      });

      test('gets session search options from session service', async () => {
        const sessionId = 'sid';
        setup({
          isRestore: true,
          isStored: true,
          sessionId,
        });

        await searchInterceptor.search(mockRequest, { sessionId }).toPromise();
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            options: { sessionId, isStored: true, isRestore: true },
          })
        );

        expect(
          (searchMock.session as jest.Mocked<ISessionService>).getSearchOptions
        ).toHaveBeenCalledWith(sessionId);
      });

      test("doesn't forward sessionId if search options return null", async () => {
        const sessionId = 'sid';
        setup(null);

        await searchInterceptor.search(mockRequest, { sessionId }).toPromise();
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.not.objectContaining({
            options: { sessionId },
          })
        );

        expect(
          (searchMock.session as jest.Mocked<ISessionService>).getSearchOptions
        ).toHaveBeenCalledWith(sessionId);
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
            statusCode: 500,
            message: 'Request timed out',
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
            statusCode: 500,
            message: 'Request timed out',
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
            statusCode: 500,
            message: 'Request timed out',
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
            statusCode: 500,
            message: 'Request timed out',
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
          statusCode: 400,
          message: 'search_phase_execution_exception',
          attributes: searchPhaseException.error,
        };
        fetchMock.mockRejectedValueOnce(mockResponse);
        const mockRequest: IEsSearchRequest = {
          params: {},
        };
        const response = searchInterceptor.search(mockRequest);
        await expect(response.toPromise()).rejects.toThrow(PainlessError);
      });

      test('Should throw ES error on ES server error', async () => {
        const mockResponse: any = {
          statusCode: 400,
          message: 'resource_not_found_exception',
          attributes: resourceNotFoundException.error,
        };
        fetchMock.mockRejectedValueOnce(mockResponse);
        const mockRequest: IEsSearchRequest = {
          params: {},
        };
        const response = searchInterceptor.search(mockRequest);
        await expect(response.toPromise()).rejects.toThrow(EsError);
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
