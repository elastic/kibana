/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { ISessionsClient } from './sessions_client';
import { ISessionService } from './session_service';
import { SearchSessionState } from './search_session_state';
import type { SessionMeta } from './search_session_state';

export function getSessionsClientMock(): jest.Mocked<ISessionsClient> {
  return {
    get: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    extend: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  };
}

export function getSessionServiceMock(): jest.Mocked<ISessionService> {
  return {
    clear: jest.fn(),
    start: jest.fn(),
    restore: jest.fn(),
    getSessionId: jest.fn(),
    getSession$: jest.fn(() => new BehaviorSubject(undefined).asObservable()),
    state$: new BehaviorSubject<SearchSessionState>(SearchSessionState.None).asObservable(),
    sessionMeta$: new BehaviorSubject<SessionMeta>({
      state: SearchSessionState.None,
    }).asObservable(),
    renameCurrentSession: jest.fn(),
    trackSearch: jest.fn((searchDescriptor) => () => {}),
    destroy: jest.fn(),
    cancel: jest.fn(),
    isStored: jest.fn(),
    isRestore: jest.fn(),
    save: jest.fn(),
    isCurrentSession: jest.fn(),
    getSearchOptions: jest.fn(),
    enableStorage: jest.fn(),
    isSessionStorageReady: jest.fn(() => true),
    getSearchSessionIndicatorUiConfig: jest.fn(() => ({ isDisabled: () => ({ disabled: false }) })),
    hasAccess: jest.fn(() => true),
    continue: jest.fn(),
  };
}
