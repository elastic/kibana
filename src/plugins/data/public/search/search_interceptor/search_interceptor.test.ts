/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { IEsSearchRequest } from '@kbn/search-types';
import { SearchInterceptor } from './search_interceptor';
import { AbortError } from '@kbn/kibana-utils-plugin/public';
import { EsError, type IEsError } from '@kbn/search-errors';
import { ISessionService, SearchSessionState } from '..';
import { bfetchPluginMock } from '@kbn/bfetch-plugin/public/mocks';
import { BfetchPublicSetup } from '@kbn/bfetch-plugin/public';

import * as searchPhaseException from '../../../common/search/test_data/search_phase_execution_exception.json';
import * as resourceNotFoundException from '../../../common/search/test_data/resource_not_found_exception.json';
import { BehaviorSubject } from 'rxjs';
import { dataPluginMock } from '../../mocks';
import { UI_SETTINGS } from '../../../common';
import type { SearchServiceStartDependencies } from '../search_service';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { SearchTimeoutError, TimeoutErrorMode } from './timeout_error';

jest.mock('./create_request_hash', () => {
  const originalModule = jest.requireActual('./create_request_hash');
  return {
    ...originalModule,
    createRequestHash: jest.fn().mockImplementation((input) => {
      return Promise.resolve(JSON.stringify(input));
    }),
  };
});

jest.mock('./search_session_incomplete_warning', () => ({
  SearchSessionIncompleteWarning: jest.fn(),
}));

import { SearchSessionIncompleteWarning } from './search_session_incomplete_warning';
import { getMockSearchConfig } from '../../../config.mock';

let searchInterceptor: SearchInterceptor;
let bfetchSetup: jest.Mocked<BfetchPublicSetup>;
let fetchMock: jest.Mock<any>;

const flushPromises = () =>
  new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));

jest.useFakeTimers({ legacyFakeTimers: true });

const timeTravel = async (msToRun = 0) => {
  await flushPromises();
  jest.advanceTimersByTime(msToRun);
  return flushPromises();
};

const next = jest.fn();
const error = jest.fn();
const complete = jest.fn();

function mockFetchImplementation(responses: any[]) {
  let i = 0;
  fetchMock.mockImplementation((r, abortSignal) => {
    if (!r.request.id) i = 0;
    const { time = 0, value = {}, isError = false } = responses[i++];
    value.meta = {
      size: 10,
    };
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        return (isError ? reject : resolve)(value);
      }, time);

      if (abortSignal) {
        if (abortSignal.aborted) reject(new AbortError());
        abortSignal.addEventListener('abort', () => {
          reject(new AbortError());
        });
      }
    });
  });
}

describe('SearchInterceptor', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockCoreStart: MockedKeys<CoreStart>;
  let sessionService: jest.Mocked<ISessionService>;
  let sessionState$: BehaviorSubject<SearchSessionState>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    sessionState$ = new BehaviorSubject<SearchSessionState>(SearchSessionState.None);
    const dataPluginMockStart = dataPluginMock.createStartContract();
    sessionService = {
      ...(dataPluginMockStart.search.session as jest.Mocked<ISessionService>),
      state$: sessionState$,
    };

    fetchMock = jest.fn();
    mockCoreSetup.uiSettings.get.mockImplementation((name: string) => {
      switch (name) {
        case UI_SETTINGS.SEARCH_TIMEOUT:
          return 1000;
        default:
          return;
      }
    });

    next.mockClear();
    error.mockClear();
    complete.mockClear();
    jest.clearAllTimers();

    const bfetchMock = bfetchPluginMock.createSetupContract();
    bfetchMock.batchedFunction.mockReturnValue(fetchMock);

    const inspectorServiceMock = {
      open: () => {},
    } as unknown as InspectorStart;

    bfetchSetup = bfetchPluginMock.createSetupContract();
    bfetchSetup.batchedFunction.mockReturnValue(fetchMock);
    searchInterceptor = new SearchInterceptor({
      bfetch: bfetchSetup,
      toasts: mockCoreSetup.notifications.toasts,
      startServices: new Promise((resolve) => {
        resolve([
          mockCoreStart,
          { inspector: inspectorServiceMock } as unknown as SearchServiceStartDependencies,
          {},
        ]);
      }),
      uiSettings: mockCoreSetup.uiSettings,
      http: mockCoreSetup.http,
      executionContext: mockCoreSetup.executionContext,
      session: sessionService,
      searchConfig: getMockSearchConfig({}),
    });
  });

  describe('showError', () => {
    test('Ignores an AbortError', async () => {
      searchInterceptor.showError(new AbortError());
      expect(mockCoreSetup.notifications.toasts.addDanger).not.toBeCalled();
      expect(mockCoreSetup.notifications.toasts.addError).not.toBeCalled();
    });

    test('Ignores a SearchTimeoutError', async () => {
      searchInterceptor.showError(new SearchTimeoutError(new Error(), TimeoutErrorMode.CONTACT));
      expect(mockCoreSetup.notifications.toasts.addDanger).not.toBeCalled();
      expect(mockCoreSetup.notifications.toasts.addError).not.toBeCalled();
    });

    test('Renders a EsError', async () => {
      searchInterceptor.showError(
        new EsError(
          {
            statusCode: 400,
            message: 'search_phase_execution_exception',
            attributes: {
              error: searchPhaseException.error,
            },
          },
          'search_phase_execution_exception',
          () => {}
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
      const mockResponse: any = { rawResponse: {} };
      fetchMock.mockResolvedValueOnce(mockResponse);
      const mockRequest: IEsSearchRequest = {
        params: {},
      };
      const response = searchInterceptor.search(mockRequest);
      await expect(response.toPromise()).resolves.toBe(mockResponse);
    });

    test('should resolve immediately if first call returns full result', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({});
      response.subscribe({ next, error, complete });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(responses[0].value);
      expect(complete).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    test('should make secondary request if first call returns partial result', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
            isRunning: true,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
        {
          time: 20,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
      ];

      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error, complete });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(responses[0].value);
      expect(complete).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      await timeTravel(20);

      expect(next).toHaveBeenCalledTimes(2);
      expect(next.mock.calls[1][0]).toStrictEqual(responses[1].value);
      expect(complete).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    test('should abort on user abort', async () => {
      const responses = [
        {
          time: 500,
          value: {
            isPartial: false,
            isRunning: false,
            rawResponse: {},
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const abortController = new AbortController();
      abortController.abort();

      const response = searchInterceptor.search({}, { abortSignal: abortController.signal });
      response.subscribe({ next, error });

      await timeTravel(500);

      expect(next).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
    });

    test('should DELETE a running async search on abort', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
            isRunning: true,
            rawResponse: {},
            id: 1,
          },
        },
        {
          time: 300,
          value: {
            isPartial: false,
            isRunning: false,
            rawResponse: {},
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 250);

      const response = searchInterceptor.search(
        {},
        { abortSignal: abortController.signal, pollInterval: 0 }
      );
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      await timeTravel(240);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
    });

    test('should not DELETE a running async search on async timeout prior to first response', async () => {
      const responses = [
        {
          time: 2000,
          value: {
            isPartial: false,
            isRunning: false,
            rawResponse: {},
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(1000);

      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();
    });

    test('should DELETE a running async search on async timeout after first response', async () => {
      fetchMock.mockResolvedValue({
        isPartial: true,
        isRunning: true,
        rawResponse: {},
        id: 1,
      });

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout
      await timeTravel(1000);

      expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
    });

    test('should return the last response on async timeout', async () => {
      fetchMock.mockResolvedValue({
        isPartial: true,
        isRunning: true,
        rawResponse: {
          foo: 'bar',
        },
        id: 1,
      });

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout but not long enough to reach the next response
      await timeTravel(1000);

      expect(next).toHaveBeenCalledTimes(3);
      expect(next.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": 1,
            "isPartial": true,
            "isRunning": true,
            "rawResponse": Object {
              "foo": "bar",
            },
          },
        ]
      `);
    });

    test('should DELETE a running async search on async timeout on error from fetch', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
            isRunning: true,
            rawResponse: {},
            id: 1,
          },
        },
        {
          time: 10,
          value: {
            statusCode: 500,
            message: 'oh no',
            id: 1,
          },
          isError: true,
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout but not long enough to reach the next response
      await timeTravel(10);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((error.mock.calls[0][0] as Error).message).toBe('oh no');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
    });

    test('should not leak unresolved promises if DELETE fails', async () => {
      mockCoreSetup.http.delete.mockRejectedValueOnce({ status: 404, statusText: 'Not Found' });
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
            isRunning: true,
            rawResponse: {},
            id: 1,
          },
        },
        {
          time: 10,
          value: {
            statusCode: 500,
            message: 'oh no',
            id: 1,
          },
          isError: true,
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout but not long enough to reach the next response
      await timeTravel(10);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((error.mock.calls[0][0] as Error).message).toBe('oh no');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
    });

    test('should NOT DELETE a running SAVED async search on abort', async () => {
      const sessionId = 'sessionId';
      sessionService.isCurrentSession.mockImplementation((_sessionId) => _sessionId === sessionId);
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
            isRunning: true,
            rawResponse: {},
            id: 1,
          },
        },
        {
          time: 300,
          value: {
            isPartial: false,
            isRunning: false,
            rawResponse: {},
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 250);

      const response = searchInterceptor.search(
        {},
        { abortSignal: abortController.signal, pollInterval: 0, sessionId }
      );
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      sessionState$.next(SearchSessionState.BackgroundLoading);

      await timeTravel(240);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();
    });

    describe('Search session', () => {
      const setup = (
        opts: {
          isRestore?: boolean;
          isStored?: boolean;
          sessionId?: string;
        } | null
      ) => {
        const sessionServiceMock = sessionService as jest.Mocked<ISessionService>;
        sessionServiceMock.getSearchOptions.mockImplementation(() =>
          opts && opts.sessionId
            ? {
                sessionId: opts.sessionId,
                isRestore: opts.isRestore ?? false,
                isStored: opts.isStored ?? false,
              }
            : null
        );
        sessionServiceMock.isRestore.mockReturnValue(!!opts?.isRestore);
        sessionServiceMock.getSessionId.mockImplementation(() => opts?.sessionId);
        fetchMock.mockResolvedValue({ result: 200 });
      };

      const mockRequest: IEsSearchRequest = {
        params: {},
      };

      afterEach(() => {
        const sessionServiceMock = sessionService as jest.Mocked<ISessionService>;
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

        await searchInterceptor
          .search(mockRequest, { sessionId })
          .toPromise()
          .catch(() => {});
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            options: {
              sessionId,
              isStored: true,
              isRestore: true,
              isSearchStored: false,
              strategy: 'ese',
            },
          })
        );

        expect(
          (sessionService as jest.Mocked<ISessionService>).getSearchOptions
        ).toHaveBeenCalledWith(sessionId);
      });

      test("doesn't forward sessionId if search options return null", async () => {
        const sessionId = 'sid';
        setup(null);

        await searchInterceptor
          .search(mockRequest, { sessionId })
          .toPromise()
          .catch(() => {});
        expect(fetchMock.mock.calls[0][0]).toEqual(
          expect.not.objectContaining({
            options: { sessionId },
          })
        );

        expect(
          (sessionService as jest.Mocked<ISessionService>).getSearchOptions
        ).toHaveBeenCalledWith(sessionId);
      });

      test('should not show warning if a search is available during restore', async () => {
        setup({
          isRestore: true,
          isStored: true,
          sessionId: '123',
        });

        const responses = [
          {
            time: 10,
            value: {
              isPartial: false,
              isRunning: false,
              isRestored: true,
              id: 1,
              rawResponse: {
                took: 1,
              },
            },
          },
        ];
        mockFetchImplementation(responses);

        const response = searchInterceptor.search(
          {},
          {
            sessionId: '123',
          }
        );
        response.subscribe({ next, error, complete });

        await timeTravel(10);

        expect(SearchSessionIncompleteWarning).toBeCalledTimes(0);
      });

      test('should not show warning if a search outside of session is running', async () => {
        setup({
          isRestore: false,
          isStored: false,
        });

        const responses = [
          {
            time: 10,
            value: {
              isPartial: false,
              isRunning: false,
              isRestored: false,
              id: 1,
              rawResponse: {
                took: 1,
              },
            },
          },
        ];
        mockFetchImplementation(responses);

        const response = searchInterceptor.search(
          {},
          {
            sessionId: undefined,
          }
        );
        response.subscribe({ next, error, complete });

        await timeTravel(10);

        expect(SearchSessionIncompleteWarning).toBeCalledTimes(0);
      });

      test('should show warning once if a search is not available during restore', async () => {
        setup({
          isRestore: true,
          isStored: true,
          sessionId: '123',
        });

        const responses = [
          {
            time: 10,
            value: {
              isPartial: false,
              isRunning: false,
              isRestored: false,
              id: 1,
              rawResponse: {
                took: 1,
              },
            },
          },
        ];
        mockFetchImplementation(responses);

        searchInterceptor
          .search(
            {},
            {
              sessionId: '123',
            }
          )
          .subscribe({ next, error, complete });

        await timeTravel(10);

        expect(SearchSessionIncompleteWarning).toBeCalledTimes(1);

        searchInterceptor
          .search(
            {},
            {
              sessionId: '123',
            }
          )
          .subscribe({ next, error, complete });

        await timeTravel(10);

        expect(SearchSessionIncompleteWarning).toBeCalledTimes(1);
      });
    });

    describe('Session tracking', () => {
      beforeEach(() => {
        const responses = [
          {
            time: 10,
            value: {
              isPartial: true,
              isRunning: true,
              rawResponse: {},
              id: 1,
            },
          },
          {
            time: 300,
            value: {
              isPartial: false,
              isRunning: false,
              rawResponse: {},
              id: 1,
            },
          },
        ];

        mockFetchImplementation(responses);
      });

      test('should track searches', async () => {
        const sessionId = 'sessionId';
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const trackSearchComplete = jest.fn();
        sessionService.trackSearch.mockImplementation(() => ({
          complete: trackSearchComplete,
          error: () => {},
          beforePoll: () => [{ isSearchStored: false }, () => {}],
        }));

        const response = searchInterceptor.search({}, { pollInterval: 0, sessionId });
        response.subscribe({ next, error });
        await timeTravel(10);
        expect(sessionService.trackSearch).toBeCalledTimes(1);
        expect(trackSearchComplete).not.toBeCalled();
        await timeTravel(300);
        expect(sessionService.trackSearch).toBeCalledTimes(1);
        expect(trackSearchComplete).toBeCalledTimes(1);
      });

      test('session service should be able to cancel search', async () => {
        const sessionId = 'sessionId';
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const response = searchInterceptor.search({}, { pollInterval: 0, sessionId });
        response.subscribe({ next, error });
        await timeTravel(10);
        expect(sessionService.trackSearch).toBeCalledTimes(1);

        const abort = sessionService.trackSearch.mock.calls[0][0].abort;
        expect(abort).toBeInstanceOf(Function);

        abort();

        await timeTravel(10);

        expect(error).toHaveBeenCalled();
        expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
      });

      test("don't track non current session searches", async () => {
        const sessionId = 'sessionId';
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const response1 = searchInterceptor.search(
          {},
          { pollInterval: 0, sessionId: 'something different' }
        );
        response1.subscribe({ next, error });

        const response2 = searchInterceptor.search({}, { pollInterval: 0, sessionId: undefined });
        response2.subscribe({ next, error });

        await timeTravel(10);
        expect(sessionService.trackSearch).toBeCalledTimes(0);
      });

      test("don't track if no current session", async () => {
        sessionService.getSessionId.mockImplementation(() => undefined);
        sessionService.isCurrentSession.mockImplementation((_sessionId) => false);

        const response1 = searchInterceptor.search(
          {},
          { pollInterval: 0, sessionId: 'something different' }
        );
        response1.subscribe({ next, error });

        const response2 = searchInterceptor.search({}, { pollInterval: 0, sessionId: undefined });
        response2.subscribe({ next, error });

        await timeTravel(10);
        expect(sessionService.trackSearch).toBeCalledTimes(0);
      });
    });

    describe('session client caching', () => {
      const sessionId = 'sessionId';
      const basicReq = {
        params: {
          test: 1,
        },
      };

      const basicCompleteResponse = [
        {
          time: 10,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
      ];

      const partialCompleteResponse = [
        {
          time: 10,
          value: {
            isPartial: true,
            isRunning: true,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
        {
          time: 20,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
      ];

      beforeEach(() => {
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);
      });

      test('should be disabled if there is no session', async () => {
        mockFetchImplementation(basicCompleteResponse);

        searchInterceptor.search(basicReq, {}).subscribe({ next, error, complete });
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor.search(basicReq, {}).subscribe({ next, error, complete });
        expect(fetchMock).toBeCalledTimes(2);
      });

      test('should fetch different requests in a single session', async () => {
        mockFetchImplementation(basicCompleteResponse);

        const req2 = {
          params: {
            test: 2,
          },
        };

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor.search(req2, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(2);
      });

      test('should fetch the same request for two different sessions', async () => {
        mockFetchImplementation(basicCompleteResponse);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor
          .search(basicReq, { sessionId: 'anotherSession' })
          .subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(2);
      });

      test('should not track searches that come from cache', async () => {
        mockFetchImplementation(partialCompleteResponse);
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const completeSearch = jest.fn();

        sessionService.trackSearch.mockImplementation((params) => ({
          complete: completeSearch,
          error: jest.fn(),
          beforePoll: jest.fn(() => {
            return [{ isSearchStored: false }, () => {}];
          }),
        }));

        const req = {
          params: {
            test: 200,
          },
        };

        const response = searchInterceptor.search(req, { pollInterval: 1, sessionId });
        const response2 = searchInterceptor.search(req, { pollInterval: 1, sessionId });
        response.subscribe({ next, error, complete });
        response2.subscribe({ next, error, complete });
        await timeTravel(10);

        expect(fetchMock).toBeCalledTimes(1);
        expect(sessionService.trackSearch).toBeCalledTimes(1);
        expect(completeSearch).not.toBeCalled();
        await timeTravel(300);
        // Should be called only 2 times (once per partial response)
        expect(fetchMock).toBeCalledTimes(2);
        expect(sessionService.trackSearch).toBeCalledTimes(1);
        expect(completeSearch).toBeCalledTimes(1);

        expect(next).toBeCalledTimes(4);
        expect(error).toBeCalledTimes(0);
        expect(complete).toBeCalledTimes(2);
      });

      test('should cache partial responses', async () => {
        const responses = [
          {
            time: 10,
            value: {
              isPartial: true,
              isRunning: true,
              rawResponse: {},
              id: 1,
            },
          },
        ];

        mockFetchImplementation(responses);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);
      });

      test('should not cache error responses', async () => {
        const responses = [
          {
            time: 10,
            value: {
              isPartial: true,
              isRunning: false,
              id: 1,
            },
          },
        ];

        mockFetchImplementation(responses);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(2);
      });

      test('should ignore anything outside params when hashing', async () => {
        mockFetchImplementation(basicCompleteResponse);

        const req = {
          something: 123,
          params: {
            test: 1,
          },
        };

        const req2 = {
          something: 321,
          params: {
            test: 1,
          },
        };

        searchInterceptor.search(req, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor.search(req2, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);
      });

      test('should deliver error to all replays', async () => {
        const responses = [
          {
            time: 10,
            value: {},
          },
        ];

        mockFetchImplementation(responses);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);
        expect(error).toBeCalledTimes(2);
        expect(error.mock.calls[0][0].message).toEqual('Aborted');
        expect(error.mock.calls[1][0].message).toEqual('Aborted');
      });

      test('should ignore preference when hashing', async () => {
        mockFetchImplementation(basicCompleteResponse);

        const req = {
          params: {
            test: 1,
            preference: 123,
          },
        };

        const req2 = {
          params: {
            test: 1,
            preference: 321,
          },
        };

        searchInterceptor.search(req, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor.search(req2, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);
      });

      test('should return from cache for identical requests in the same session', async () => {
        mockFetchImplementation(basicCompleteResponse);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);
      });

      test('aborting a search that didnt get any response should retrigger search', async () => {
        mockFetchImplementation(basicCompleteResponse);

        const abortController = new AbortController();

        // Start a search request
        searchInterceptor
          .search(basicReq, { sessionId, abortSignal: abortController.signal })
          .subscribe({ next, error, complete });

        // Abort the search request before it started
        abortController.abort();

        // Time travel to make sure nothing appens
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(0);
        expect(next).toBeCalledTimes(0);
        expect(error).toBeCalledTimes(1);
        expect(complete).toBeCalledTimes(0);

        const error2 = jest.fn();
        const next2 = jest.fn();
        const complete2 = jest.fn();

        // Search for the same thing again
        searchInterceptor
          .search(basicReq, { sessionId })
          .subscribe({ next: next2, error: error2, complete: complete2 });

        // Should search again
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);
        expect(next2).toBeCalledTimes(1);
        expect(error2).toBeCalledTimes(0);
        expect(complete2).toBeCalledTimes(1);
      });

      test('aborting a running first search shouldnt clear cache', async () => {
        mockFetchImplementation(partialCompleteResponse);
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const completeSearch = jest.fn();

        sessionService.trackSearch.mockImplementation((params) => ({
          complete: completeSearch,
          error: jest.fn(),
          beforePoll: jest.fn(() => {
            return [{ isSearchStored: false }, () => {}];
          }),
        }));

        const req = {
          params: {
            test: 200,
          },
        };

        const abortController = new AbortController();

        const response = searchInterceptor.search(req, {
          pollInterval: 1,
          sessionId,
          abortSignal: abortController.signal,
        });
        response.subscribe({ next, error, complete });
        await timeTravel(10);

        expect(fetchMock).toBeCalledTimes(1);
        expect(next).toBeCalledTimes(1);
        expect(error).toBeCalledTimes(0);
        expect(complete).toBeCalledTimes(0);
        expect(sessionService.trackSearch).toBeCalledTimes(1);

        const next2 = jest.fn();
        const error2 = jest.fn();
        const complete2 = jest.fn();
        const response2 = searchInterceptor.search(req, { pollInterval: 1, sessionId });
        response2.subscribe({ next: next2, error: error2, complete: complete2 });
        await timeTravel(0);

        abortController.abort();

        await timeTravel(300);
        // Only first searches should be tracked and untracked
        expect(sessionService.trackSearch).toBeCalledTimes(1);
        expect(completeSearch).toBeCalledTimes(1);

        // First search should error
        expect(next).toBeCalledTimes(1);
        expect(error).toBeCalledTimes(1);
        expect(complete).toBeCalledTimes(0);

        // Second search should complete
        expect(next2).toBeCalledTimes(2);
        expect(error2).toBeCalledTimes(0);
        expect(complete2).toBeCalledTimes(1);

        // Should be called only 2 times (once per partial response)
        expect(fetchMock).toBeCalledTimes(2);
      });

      test('aborting a running second search shouldnt clear cache', async () => {
        mockFetchImplementation(partialCompleteResponse);
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const completeSearch = jest.fn();

        sessionService.trackSearch.mockImplementation((params) => ({
          complete: completeSearch,
          error: jest.fn(),
          beforePoll: jest.fn(() => {
            return [{ isSearchStored: false }, () => {}];
          }),
        }));

        const req = {
          params: {
            test: 200,
          },
        };

        const abortController = new AbortController();

        const response = searchInterceptor.search(req, { pollInterval: 1, sessionId });
        response.subscribe({ next, error, complete });
        await timeTravel(10);

        expect(fetchMock).toBeCalledTimes(1);
        expect(next).toBeCalledTimes(1);
        expect(error).toBeCalledTimes(0);
        expect(complete).toBeCalledTimes(0);
        expect(sessionService.trackSearch).toBeCalledTimes(1);
        expect(completeSearch).not.toBeCalled();

        const next2 = jest.fn();
        const error2 = jest.fn();
        const complete2 = jest.fn();
        const response2 = searchInterceptor.search(req, {
          pollInterval: 0,
          sessionId,
          abortSignal: abortController.signal,
        });
        response2.subscribe({ next: next2, error: error2, complete: complete2 });
        await timeTravel(0);

        abortController.abort();

        await timeTravel(300);
        expect(sessionService.trackSearch).toBeCalledTimes(1);
        expect(completeSearch).toBeCalledTimes(1);

        expect(next).toBeCalledTimes(2);
        expect(error).toBeCalledTimes(0);
        expect(complete).toBeCalledTimes(1);

        expect(next2).toBeCalledTimes(1);
        expect(error2).toBeCalledTimes(1);
        expect(complete2).toBeCalledTimes(0);

        // Should be called only 2 times (once per partial response)
        expect(fetchMock).toBeCalledTimes(2);
      });

      test('aborting both requests should cancel underlaying search only once', async () => {
        mockFetchImplementation(partialCompleteResponse);
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const req = {
          params: {
            test: 200,
          },
        };

        const abortController = new AbortController();

        const response = searchInterceptor.search(req, {
          pollInterval: 1,
          sessionId,
          abortSignal: abortController.signal,
        });
        response.subscribe({ next, error, complete });

        const response2 = searchInterceptor.search(req, {
          pollInterval: 1,
          sessionId,
          abortSignal: abortController.signal,
        });
        response2.subscribe({ next, error, complete });
        await timeTravel(10);

        abortController.abort();

        await timeTravel(300);

        expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
      });

      test('aborting both searches should stop searching and clear cache', async () => {
        mockFetchImplementation(partialCompleteResponse);
        sessionService.isCurrentSession.mockImplementation(
          (_sessionId) => _sessionId === sessionId
        );
        sessionService.getSessionId.mockImplementation(() => sessionId);

        const completeSearch = jest.fn();

        sessionService.trackSearch.mockImplementation((params) => ({
          complete: completeSearch,
          error: jest.fn(),
          beforePoll: jest.fn(() => {
            return [{ isSearchStored: false }, () => {}];
          }),
        }));

        const req = {
          params: {
            test: 200,
          },
        };

        const abortController = new AbortController();

        const response = searchInterceptor.search(req, {
          pollInterval: 1,
          sessionId,
          abortSignal: abortController.signal,
        });
        response.subscribe({ next, error, complete });
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        const response2 = searchInterceptor.search(req, {
          pollInterval: 1,
          sessionId,
          abortSignal: abortController.signal,
        });
        response2.subscribe({ next, error, complete });
        await timeTravel(0);
        expect(fetchMock).toBeCalledTimes(1);

        abortController.abort();

        await timeTravel(300);

        expect(next).toBeCalledTimes(2);
        expect(error).toBeCalledTimes(2);
        expect(complete).toBeCalledTimes(0);
        expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
        expect(error.mock.calls[1][0]).toBeInstanceOf(AbortError);

        // Should be called only 1 times (one partial response)
        expect(fetchMock).toBeCalledTimes(1);

        // Clear mock and research
        fetchMock.mockReset();
        mockFetchImplementation(partialCompleteResponse);
        // Run the search again to see that we don't hit the cache
        const response3 = searchInterceptor.search(req, { pollInterval: 1, sessionId });
        response3.subscribe({ next, error, complete });

        await timeTravel(10);
        await timeTravel(10);
        await timeTravel(300);

        // Should be called 2 times (two partial response)
        expect(fetchMock).toBeCalledTimes(2);
        expect(complete).toBeCalledTimes(1);
      });

      test("aborting a completed search shouldn't effect cache", async () => {
        mockFetchImplementation(basicCompleteResponse);

        const abortController = new AbortController();

        // Start a search request
        searchInterceptor
          .search(basicReq, { sessionId, abortSignal: abortController.signal })
          .subscribe({ next, error, complete });

        // Get a final response
        await timeTravel(10);
        expect(fetchMock).toBeCalledTimes(1);

        // Abort the search request
        abortController.abort();

        // Search for the same thing again
        searchInterceptor.search(basicReq, { sessionId }).subscribe({ next, error, complete });

        // Get the response from cache
        expect(fetchMock).toBeCalledTimes(1);
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

      test('Should throw ES error on ES server error', async () => {
        const mockResponse: IEsError = {
          statusCode: 400,
          message: 'resource_not_found_exception',
          attributes: {
            error: resourceNotFoundException.error,
          },
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

        error.mockImplementation((e) => {
          expect(next).not.toBeCalled();
          expect(e).toBeInstanceOf(AbortError);
        });

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

        error.mockImplementation((e) => {
          expect(e).toBeInstanceOf(AbortError);
          expect(fetchMock).not.toBeCalled();
        });

        response.subscribe({ error });
      });
    });
  });
});
