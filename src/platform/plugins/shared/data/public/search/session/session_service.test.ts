/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ISessionService, SessionService } from './session_service';
import { coreMock } from '@kbn/core/public/mocks';
import { first, take, toArray } from 'rxjs';
import { getSessionsClientMock } from './mocks';
import { BehaviorSubject } from 'rxjs';
import { SearchSessionState } from './search_session_state';
import { createNowProviderMock } from '../../now_provider/mocks';
import { NowProviderInternalContract } from '../../now_provider';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import type { ISessionsClient, SearchSessionSavedObject } from './sessions_client';
import { CoreStart } from '@kbn/core/public';
import { SearchUsageCollector } from '../..';
import { createSearchUsageCollectorMock } from '../collectors/mocks';

const mockSavedObject: SearchSessionSavedObject = {
  id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
  type: 'search-session',
  attributes: {
    name: 'my_name',
    appId: 'my_app_id',
    locatorId: 'my_locator_id',
    idMapping: {},
    sessionId: 'session_id',
    created: new Date().toISOString(),
    expires: new Date().toISOString(),
    version: '8.0.0',
  },
  references: [],
};

describe('Session service', () => {
  let sessionService: ISessionService;
  let state$: BehaviorSubject<SearchSessionState>;
  let nowProvider: jest.Mocked<NowProviderInternalContract>;
  let userHasAccessToSearchSessions = true;
  let currentAppId$: BehaviorSubject<string>;
  let toastService: jest.Mocked<CoreStart['notifications']['toasts']>;
  let sessionsClient: jest.Mocked<ISessionsClient>;
  let usageCollector: jest.Mocked<SearchUsageCollector>;

  beforeEach(() => {
    const initializerContext = coreMock.createPluginInitializerContext({
      search: {
        sessions: {
          notTouchedTimeout: 5 * 60 * 1000,
        },
      },
    });
    const startService = coreMock.createSetup().getStartServices;
    const startServicesMock = coreMock.createStart();
    toastService = startServicesMock.notifications.toasts;
    nowProvider = createNowProviderMock();
    currentAppId$ = new BehaviorSubject('app');
    sessionsClient = getSessionsClientMock();
    sessionsClient.get.mockImplementation(async (id) => ({
      ...mockSavedObject,
      id,
      attributes: { ...mockSavedObject.attributes, sessionId: id },
    }));
    usageCollector = createSearchUsageCollectorMock();
    sessionService = new SessionService(
      initializerContext,
      () =>
        startService().then(([coreStart, ...rest]) => [
          {
            ...startServicesMock,
            application: {
              ...coreStart.application,
              currentAppId$,
              capabilities: {
                ...coreStart.application.capabilities,
                management: {
                  kibana: {
                    [SEARCH_SESSIONS_MANAGEMENT_ID]: userHasAccessToSearchSessions,
                  },
                },
              },
            },
          },
          ...rest,
        ]),
      sessionsClient,
      nowProvider,
      usageCollector,
      { freezeState: false } // needed to use mocks inside state container
    );
    state$ = new BehaviorSubject<SearchSessionState>(SearchSessionState.None);
    sessionService.state$.subscribe(state$);
  });

  describe('Session management', () => {
    it('Creates and clears a session', async () => {
      sessionService.start();
      expect(sessionService.getSessionId()).not.toBeUndefined();
      expect(nowProvider.set).toHaveBeenCalled();
      sessionService.clear();
      expect(sessionService.getSessionId()).toBeUndefined();
      expect(nowProvider.reset).toHaveBeenCalled();
    });

    it("Can't clear other apps' session", async () => {
      sessionService.start();
      expect(sessionService.getSessionId()).not.toBeUndefined();
      currentAppId$.next('change');
      sessionService.clear();
      expect(sessionService.getSessionId()).not.toBeUndefined();
    });

    it("Can start a new session in case there is other apps' stale session", async () => {
      const s1 = sessionService.start();
      expect(sessionService.getSessionId()).not.toBeUndefined();
      currentAppId$.next('change');
      sessionService.start();
      expect(sessionService.getSessionId()).not.toBeUndefined();
      expect(sessionService.getSessionId()).not.toBe(s1);
    });

    it('Restores a session', async () => {
      const sessionId = 'sessionId';
      sessionService.restore(sessionId);
      expect(sessionService.getSessionId()).toBe(sessionId);
    });

    it('sessionId$ observable emits current value', async () => {
      sessionService.restore('1');
      const emittedValues = sessionService.getSession$().pipe(take(3), toArray()).toPromise();
      sessionService.restore('2');
      sessionService.clear();

      expect(await emittedValues).toEqual(['1', '2', undefined]);
    });

    it('Tracks searches for current session', () => {
      expect(() =>
        sessionService.trackSearch({ abort: () => {}, poll: async () => {} })
      ).toThrowError();
      expect(state$.getValue()).toBe(SearchSessionState.None);

      sessionService.start();
      const complete1 = sessionService.trackSearch({
        abort: () => {},
        poll: async () => {},
      }).complete;
      expect(state$.getValue()).toBe(SearchSessionState.Loading);
      const complete2 = sessionService.trackSearch({
        abort: () => {},
        poll: async () => {},
      }).complete;

      expect(state$.getValue()).toBe(SearchSessionState.Loading);
      complete1();
      expect(state$.getValue()).toBe(SearchSessionState.Loading);
      complete2();
      expect(state$.getValue()).toBe(SearchSessionState.Completed);
    });

    it('Cancels all tracked searches within current session', async () => {
      const abort = jest.fn();
      const poll = jest.fn();

      sessionService.start();
      sessionService.trackSearch({ abort, poll });
      sessionService.trackSearch({ abort, poll });
      sessionService.trackSearch({ abort, poll });
      const complete = sessionService.trackSearch({ abort, poll }).complete;
      complete();

      await sessionService.cancel();

      expect(abort).toBeCalledTimes(3);
    });

    describe('Keeping searches alive', () => {
      let dateNowSpy: jest.SpyInstance;
      let now = Date.now();
      const advanceTimersBy = (by: number) => {
        now = now + by;
        jest.advanceTimersByTime(by);
      };
      beforeEach(() => {
        dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
        now = Date.now();
        jest.useFakeTimers();
      });
      afterEach(() => {
        dateNowSpy.mockRestore();
        jest.useRealTimers();
      });

      it('Polls all completed searches to keep them alive', async () => {
        const abort = jest.fn();
        const poll = jest.fn(() => Promise.resolve());

        sessionService.enableStorage({
          getName: async () => 'Name',
          getLocatorData: async () => ({
            id: 'id',
            initialState: {},
            restoreState: {},
          }),
        });
        sessionService.start();

        const searchTracker = sessionService.trackSearch({ abort, poll });
        searchTracker.complete();

        expect(poll).toHaveBeenCalledTimes(0);

        advanceTimersBy(30000);

        expect(poll).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('Can continue previous session from another app', async () => {
    sessionService.start();
    const sessionId = sessionService.getSessionId();

    sessionService.clear();
    currentAppId$.next('change');
    sessionService.continue(sessionId!);

    expect(sessionService.getSessionId()).toBe(sessionId);
    expect((await sessionService.sessionMeta$.pipe(first()).toPromise())!.isContinued).toBe(true);
  });

  it('Calling clear() more than once still allows previous session from another app to continue', async () => {
    sessionService.start();
    const sessionId = sessionService.getSessionId();

    sessionService.clear();
    sessionService.clear();

    currentAppId$.next('change');
    sessionService.continue(sessionId!);

    expect(sessionService.getSessionId()).toBe(sessionId);
  });

  it('Continue drops storage configuration', () => {
    sessionService.start();
    const sessionId = sessionService.getSessionId();

    sessionService.enableStorage({
      getName: async () => 'Name',
      getLocatorData: async () => ({
        id: 'id',
        initialState: {},
        restoreState: {},
      }),
    });

    expect(sessionService.isSessionStorageReady()).toBe(true);

    sessionService.clear();

    sessionService.continue(sessionId!);

    expect(sessionService.isSessionStorageReady()).toBe(false);
  });

  // it might be that search requests finish after the session is cleared and before it was continued,
  // to avoid "infinite loading" state after we continue the session we have to drop pending searches
  it('Continue drops client side loading state', async () => {
    const sessionId = sessionService.start();

    sessionService.trackSearch({ abort: () => {}, poll: async () => {} });
    expect(state$.getValue()).toBe(SearchSessionState.Loading);

    sessionService.clear(); // even allow to call clear multiple times

    expect(state$.getValue()).toBe(SearchSessionState.None);

    sessionService.continue(sessionId!);
    expect(sessionService.getSessionId()).toBe(sessionId);

    // the original search was never `untracked`,
    // but we still consider this a completed session until new search fire
    expect(state$.getValue()).toBe(SearchSessionState.Completed);
  });

  test('getSearchOptions infers isRestore & isStored from state', async () => {
    const sessionId = sessionService.start();
    const someOtherId = 'some-other-id';

    expect(sessionService.getSearchOptions(someOtherId)).toEqual({
      isStored: false,
      isRestore: false,
      sessionId: someOtherId,
    });
    expect(sessionService.getSearchOptions(sessionId)).toEqual({
      isStored: false,
      isRestore: false,
      sessionId,
    });

    sessionService.enableStorage({
      getName: async () => 'Name',
      getLocatorData: async () => ({
        id: 'id',
        initialState: {},
        restoreState: {},
      }),
    });
    await sessionService.save();

    expect(sessionService.getSearchOptions(someOtherId)).toEqual({
      isStored: false,
      isRestore: false,
      sessionId: someOtherId,
    });
    expect(sessionService.getSearchOptions(sessionId)).toEqual({
      isStored: true,
      isRestore: false,
      sessionId,
    });

    await sessionService.restore(sessionId);

    expect(sessionService.getSearchOptions(someOtherId)).toEqual({
      isStored: false,
      isRestore: false,
      sessionId: someOtherId,
    });
    expect(sessionService.getSearchOptions(sessionId)).toEqual({
      isStored: true,
      isRestore: true,
      sessionId,
    });

    expect(sessionService.getSearchOptions(undefined)).toBeNull();
  });
  test('isCurrentSession', () => {
    expect(sessionService.isCurrentSession()).toBeFalsy();

    const sessionId = sessionService.start();

    expect(sessionService.isCurrentSession()).toBeFalsy();
    expect(sessionService.isCurrentSession('some-other')).toBeFalsy();
    expect(sessionService.isCurrentSession(sessionId)).toBeTruthy();
  });

  test('enableStorage() enables storage capabilities', async () => {
    sessionService.start();
    await expect(() => sessionService.save()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No info provider for current session"`
    );

    expect(sessionService.isSessionStorageReady()).toBe(false);

    sessionService.enableStorage({
      getName: async () => 'Name',
      getLocatorData: async () => ({
        id: 'id',
        initialState: {},
        restoreState: {},
      }),
    });

    expect(sessionService.isSessionStorageReady()).toBe(true);

    await expect(() => sessionService.save()).resolves;

    sessionService.clear();
    expect(sessionService.isSessionStorageReady()).toBe(false);
  });

  test('can provide config for search session indicator', () => {
    expect(sessionService.getSearchSessionIndicatorUiConfig().isDisabled().disabled).toBe(false);
    sessionService.enableStorage(
      {
        getName: async () => 'Name',
        getLocatorData: async () => ({
          id: 'id',
          initialState: {},
          restoreState: {},
        }),
      },
      {
        isDisabled: () => ({ disabled: true, reasonText: 'text' }),
      }
    );

    expect(sessionService.getSearchSessionIndicatorUiConfig().isDisabled().disabled).toBe(true);

    sessionService.clear();
    expect(sessionService.getSearchSessionIndicatorUiConfig().isDisabled().disabled).toBe(false);
  });

  test('save() throws in case getLocatorData returns throws', async () => {
    sessionService.enableStorage({
      getName: async () => 'Name',
      getLocatorData: async () => {
        throw new Error('Haha');
      },
    });
    sessionService.start();
    await expect(() => sessionService.save()).rejects.toMatchInlineSnapshot(`[Error: Haha]`);
  });

  test('save() triggers search polling to extend searches', async () => {
    sessionService.enableStorage({
      getName: async () => 'Name',
      getLocatorData: async () => ({
        id: 'id',
        initialState: {},
        restoreState: {},
      }),
    });

    sessionService.start();
    const abort = jest.fn();
    const poll = jest.fn(() => Promise.resolve());

    const search1 = sessionService.trackSearch({ poll, abort });
    search1.complete();

    const search2 = sessionService.trackSearch({ poll, abort });
    search2.error();

    sessionService.trackSearch({ poll, abort });

    expect(poll).toHaveBeenCalledTimes(0);

    await sessionService.save();

    expect(poll).toHaveBeenCalledTimes(2); // for completed and in-progress
  });

  test('save() calls onSavingSession()', async () => {
    sessionService.enableStorage({
      getName: async () => 'Name',
      getLocatorData: async () => ({
        id: 'id',
        initialState: {},
        restoreState: {},
      }),
    });

    sessionService.start();
    const abort = jest.fn();
    const poll = jest.fn(() => Promise.resolve());
    const onSavingSession = jest.fn(() => Promise.resolve());

    sessionService.trackSearch({ poll, abort, onSavingSession });

    expect(onSavingSession).toHaveBeenCalledTimes(0);

    await sessionService.save();

    expect(onSavingSession).toHaveBeenCalledTimes(1);
  });

  describe("user doesn't have access to search session", () => {
    beforeAll(() => {
      userHasAccessToSearchSessions = false;
    });
    afterAll(() => {
      userHasAccessToSearchSessions = true;
    });

    test("getSearchOptions doesn't return sessionId", () => {
      const sessionId = sessionService.start();
      expect(sessionService.getSearchOptions(sessionId)).toBeNull();
    });

    test('save() throws', async () => {
      sessionService.start();
      await expect(() => sessionService.save()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"No access to search sessions"`
      );
    });
  });

  test("rename() doesn't throw in case rename failed but shows a toast instead", async () => {
    const renameError = new Error('Haha');
    sessionsClient.rename.mockRejectedValue(renameError);
    sessionService.enableStorage({
      getName: async () => 'Name',
      getLocatorData: async () => ({
        id: 'id',
        initialState: {},
        restoreState: {},
      }),
    });
    sessionService.start();
    await sessionService.save();
    await expect(sessionService.renameCurrentSession('New name')).resolves.toBeUndefined();
    expect(toastService.addError).toHaveBeenCalledWith(
      renameError,
      expect.objectContaining({
        title: expect.stringContaining('Failed to edit name of the search session'),
      })
    );
  });

  describe('disableSaveAfterSearchesExpire$', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test('disables save after session completes on timeout', async () => {
      const emitResult: boolean[] = [];
      sessionService.disableSaveAfterSearchesExpire$.subscribe((result) => {
        emitResult.push(result);
      });

      sessionService.start();
      const complete = sessionService.trackSearch({
        abort: () => {},
        poll: async () => {},
      }).complete;

      complete();

      expect(emitResult).toEqual([false]);

      jest.advanceTimersByTime(2 * 60 * 1000); // 2 minutes

      expect(emitResult).toEqual([false]);

      jest.advanceTimersByTime(3 * 60 * 1000); // 3 minutes

      expect(emitResult).toEqual([false, true]);

      sessionService.start();

      expect(emitResult).toEqual([false, true, false]);
    });

    test('disables save for continued from different app sessions', async () => {
      const emitResult: boolean[] = [];
      sessionService.disableSaveAfterSearchesExpire$.subscribe((result) => {
        emitResult.push(result);
      });

      const sessionId = sessionService.start();

      const complete = sessionService.trackSearch({
        abort: () => {},
        poll: async () => {},
      }).complete;

      complete();

      expect(emitResult).toEqual([false]);

      sessionService.clear();

      sessionService.continue(sessionId);

      expect(emitResult).toEqual([false, true]);

      sessionService.start();

      expect(emitResult).toEqual([false, true, false]);
    });

    test('emits usage once', async () => {
      const emitResult: boolean[] = [];
      sessionService.disableSaveAfterSearchesExpire$.subscribe((result) => {
        emitResult.push(result);
      });
      sessionService.disableSaveAfterSearchesExpire$.subscribe(); // testing that source is shared

      sessionService.start();
      const complete = sessionService.trackSearch({
        abort: () => {},
        poll: async () => {},
      }).complete;

      expect(usageCollector.trackSessionIndicatorSaveDisabled).toHaveBeenCalledTimes(0);

      complete();

      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      expect(usageCollector.trackSessionIndicatorSaveDisabled).toHaveBeenCalledTimes(1);

      sessionService.start();

      expect(usageCollector.trackSessionIndicatorSaveDisabled).toHaveBeenCalledTimes(1);
    });
  });
});
