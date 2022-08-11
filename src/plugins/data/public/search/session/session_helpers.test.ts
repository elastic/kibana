/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { waitUntilNextSessionCompletes$ } from './session_helpers';
import { ISessionService, SessionService } from './session_service';
import { BehaviorSubject } from 'rxjs';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { SearchSessionState } from './search_session_state';
import { NowProviderInternalContract } from '../../now_provider';
import { coreMock } from '@kbn/core/public/mocks';
import { createNowProviderMock } from '../../now_provider/mocks';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import { getSessionsClientMock } from './mocks';

let sessionService: ISessionService;
let state$: BehaviorSubject<SearchSessionState>;
let nowProvider: jest.Mocked<NowProviderInternalContract>;
let currentAppId$: BehaviorSubject<string>;

beforeEach(() => {
  const initializerContext = coreMock.createPluginInitializerContext();
  const startService = coreMock.createSetup().getStartServices;
  nowProvider = createNowProviderMock();
  currentAppId$ = new BehaviorSubject('app');
  sessionService = new SessionService(
    initializerContext,
    () =>
      startService().then(([coreStart, ...rest]) => [
        {
          ...coreStart,
          application: {
            ...coreStart.application,
            currentAppId$,
            capabilities: {
              ...coreStart.application.capabilities,
              management: {
                kibana: {
                  [SEARCH_SESSIONS_MANAGEMENT_ID]: true,
                },
              },
            },
          },
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

describe('waitUntilNextSessionCompletes$', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  test(
    'emits when next session starts',
    fakeSchedulers((advance) => {
      sessionService.start();
      let untrackSearch = sessionService.trackSearch({ abort: () => {} });
      untrackSearch();

      const next = jest.fn();
      const complete = jest.fn();
      waitUntilNextSessionCompletes$(sessionService).subscribe({ next, complete });
      expect(next).not.toBeCalled();

      sessionService.start();
      expect(next).not.toBeCalled();

      untrackSearch = sessionService.trackSearch({ abort: () => {} });
      untrackSearch();

      expect(next).not.toBeCalled();
      advance(500);
      expect(next).not.toBeCalled();
      advance(1000);
      expect(next).toBeCalledTimes(1);
      expect(complete).toBeCalled();
    })
  );
});
