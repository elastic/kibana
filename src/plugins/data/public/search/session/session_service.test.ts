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
import { SessionState } from './session_state';

describe('Session service', () => {
  let sessionService: ISessionService;
  let state$: BehaviorSubject<SessionState>;

  beforeEach(() => {
    const initializerContext = coreMock.createPluginInitializerContext();
    sessionService = new SessionService(
      initializerContext,
      coreMock.createSetup().getStartServices,
      getSessionsClientMock(),
      { freezeState: false } // needed to use mocks inside state container
    );
    state$ = new BehaviorSubject<SessionState>(SessionState.None);
    sessionService.state$.subscribe(state$);
  });

  describe('Session management', () => {
    it('Creates and clears a session', async () => {
      sessionService.start();
      expect(sessionService.getSessionId()).not.toBeUndefined();
      sessionService.clear();
      expect(sessionService.getSessionId()).toBeUndefined();
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
      expect(state$.getValue()).toBe(SessionState.None);

      sessionService.start();
      const untrack1 = sessionService.trackSearch({ abort: () => {} });
      expect(state$.getValue()).toBe(SessionState.Loading);
      const untrack2 = sessionService.trackSearch({ abort: () => {} });
      expect(state$.getValue()).toBe(SessionState.Loading);
      untrack1();
      expect(state$.getValue()).toBe(SessionState.Loading);
      untrack2();
      expect(state$.getValue()).toBe(SessionState.Completed);
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
});
