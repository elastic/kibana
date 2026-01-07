/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { ISessionsClient } from './sessions_client';
import type { ISessionService } from './session_service';
import { SearchSessionState } from './search_session_state';
import type { SessionMeta } from './search_session_state';
import type { PersistedSearchSessionSavedObjectAttributes } from './sessions_mgmt/types';
import type { ISearchSessionEBTManager } from './ebt_manager';

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

export function getSessionServiceMock(
  overrides: Partial<jest.Mocked<ISessionService>> = {}
): jest.Mocked<ISessionService> {
  return {
    clear: jest.fn(),
    start: jest.fn(),
    restore: jest.fn(),
    reset: jest.fn(),
    getSessionId: jest.fn(),
    getSession$: jest.fn(() => new BehaviorSubject(undefined).asObservable()),
    state$: new BehaviorSubject<SearchSessionState>(SearchSessionState.None).asObservable(),
    sessionMeta$: new BehaviorSubject<SessionMeta>({
      state: SearchSessionState.None,
      isContinued: false,
    }).asObservable(),
    renameCurrentSession: jest.fn(),
    trackSearch: jest.fn((searchDescriptor) => ({
      complete: jest.fn(),
      error: jest.fn(),
      beforePoll: jest.fn(() => {
        return [{ isSearchStored: false }, () => {}];
      }),
    })),
    destroy: jest.fn(),
    cancel: jest.fn(),
    isSaving: jest.fn(),
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
    ...overrides,
  };
}

export const getPersistedSearchSessionSavedObjectAttributesMock = (
  overrides: Partial<PersistedSearchSessionSavedObjectAttributes> = {}
): PersistedSearchSessionSavedObjectAttributes => {
  return {
    sessionId: 'test-session-id',
    created: '2023-10-01T00:00:00Z',
    expires: '2023-10-08T00:00:00Z',
    idMapping: {},
    version: '8.0.0',
    name: 'Test Session',
    appId: 'testApp',
    locatorId: 'testLocator',
    initialState: {},
    restoreState: {},
    ...overrides,
  };
};

export function getSearchSessionEBTManagerMock(): jest.Mocked<ISearchSessionEBTManager> {
  return {
    trackBgsStarted: jest.fn(),
    trackBgsCompleted: jest.fn(),
    trackBgsError: jest.fn(),
    trackBgsCancelled: jest.fn(),
    trackBgsOpened: jest.fn(),
    trackBgsListView: jest.fn(),
  };
}
