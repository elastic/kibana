/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SessionService, ISessionService } from './session_service';
import { coreMock } from '../../../../../core/public/mocks';
import { take, toArray } from 'rxjs/operators';
import { getSessionsClientMock } from './mocks';
import { BehaviorSubject } from 'rxjs';
import { SearchSessionState } from './search_session_state';
import { createNowProviderMock } from '../../now_provider/mocks';
import { NowProviderInternalContract } from '../../now_provider';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import { SearchSessionSavedObject, ISessionsClient } from './sessions_client';
import { SearchSessionStatus } from '../../../common';
import { CoreStart } from 'kibana/public';

const mockSavedObject: SearchSessionSavedObject = {
  id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
  type: 'search-session',
  attributes: {
    name: 'my_name',
    appId: 'my_app_id',
    urlGeneratorId: 'my_url_generator_id',
    idMapping: {},
    sessionId: 'session_id',
    touched: new Date().toISOString(),
    created: new Date().toISOString(),
    expires: new Date().toISOString(),
    status: SearchSessionStatus.COMPLETE,
    persisted: true,
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

  beforeEach(() => {
    const initializerContext = coreMock.createPluginInitializerContext();
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

    it("Can clear other apps' session", async () => {
      sessionService.start();
      expect(sessionService.getSessionId()).not.toBeUndefined();
      currentAppId$.next('change');
      sessionService.clear();
      expect(sessionService.getSessionId()).toBeUndefined();
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
      expect(() => sessionService.trackSearch({ abort: () => {} })).toThrowError();
      expect(state$.getValue()).toBe(SearchSessionState.None);

      sessionService.start();
      const untrack1 = sessionService.trackSearch({ abort: () => {} });
      expect(state$.getValue()).toBe(SearchSessionState.Loading);
      const untrack2 = sessionService.trackSearch({ abort: () => {} });
      expect(state$.getValue()).toBe(SearchSessionState.Loading);
      untrack1();
      expect(state$.getValue()).toBe(SearchSessionState.Loading);
      untrack2();
      expect(state$.getValue()).toBe(SearchSessionState.Completed);
    });

    it('Cancels all tracked searches within current session', async () => {
      const abort = jest.fn();

      sessionService.start();
      sessionService.trackSearch({ abort });
      sessionService.trackSearch({ abort });
      sessionService.trackSearch({ abort });
      const untrack = sessionService.trackSearch({ abort });

      untrack();
      await sessionService.cancel();

      expect(abort).toBeCalledTimes(3);
    });
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
      getUrlGeneratorData: async () => ({
        urlGeneratorId: 'id',
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
      getUrlGeneratorData: async () => ({
        urlGeneratorId: 'id',
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
        getUrlGeneratorData: async () => ({
          urlGeneratorId: 'id',
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

  test('save() throws in case getUrlGeneratorData returns throws', async () => {
    sessionService.enableStorage({
      getName: async () => 'Name',
      getUrlGeneratorData: async () => {
        throw new Error('Haha');
      },
    });
    sessionService.start();
    await expect(() => sessionService.save()).rejects.toMatchInlineSnapshot(`[Error: Haha]`);
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
      getUrlGeneratorData: async () => ({
        urlGeneratorId: 'id',
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
});
