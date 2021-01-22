/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SessionService, ISessionService } from './session_service';
import { coreMock } from '../../../../../core/public/mocks';
import { take, toArray } from 'rxjs/operators';
import { getSessionsClientMock } from './mocks';
import { BehaviorSubject } from 'rxjs';
import { SearchSessionState } from './search_session_state';
import { createNowProviderMock } from '../../now_provider/mocks';
import { NowProviderInternalContract } from '../../now_provider';

describe('Session service', () => {
  let sessionService: ISessionService;
  let state$: BehaviorSubject<SearchSessionState>;
  let nowProvider: jest.Mocked<NowProviderInternalContract>;

  beforeEach(() => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const startService = coreMock.createSetup().getStartServices;
    nowProvider = createNowProviderMock();
    sessionService = new SessionService(
      initializerContext,
      () =>
        startService().then(([coreStart, ...rest]) => [
          {
            ...coreStart,
            application: { ...coreStart.application, currentAppId$: new BehaviorSubject('app') },
          },
          ...rest,
        ]),
      getSessionsClientMock(),
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

    sessionService.setSearchSessionInfoProvider({
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
  });
  test('isCurrentSession', () => {
    expect(sessionService.isCurrentSession()).toBeFalsy();

    const sessionId = sessionService.start();

    expect(sessionService.isCurrentSession()).toBeFalsy();
    expect(sessionService.isCurrentSession('some-other')).toBeFalsy();
    expect(sessionService.isCurrentSession(sessionId)).toBeTruthy();
  });
});
