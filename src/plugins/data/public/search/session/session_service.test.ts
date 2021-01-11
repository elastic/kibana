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

import { SessionService, ISessionService } from './session_service';
import { coreMock } from '../../../../../core/public/mocks';
import { take, toArray } from 'rxjs/operators';
import { getSessionsClientMock } from './mocks';
import { BehaviorSubject } from 'rxjs';
import { SearchSessionState } from './search_session_state';

describe('Session service', () => {
  let sessionService: ISessionService;
  let state$: BehaviorSubject<SearchSessionState>;

  beforeEach(() => {
    const initializerContext = coreMock.createPluginInitializerContext();
    sessionService = new SessionService(
      initializerContext,
      coreMock.createSetup().getStartServices,
      getSessionsClientMock(),
      { freezeState: false } // needed to use mocks inside state container
    );
    state$ = new BehaviorSubject<SearchSessionState>(SearchSessionState.None);
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
});
