/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { ISessionsClient } from './sessions_client';
import { ISessionService } from './session_service';
import { SearchSessionState } from './search_session_state';

export function getSessionsClientMock(): jest.Mocked<ISessionsClient> {
  return {
    get: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
    setSearchSessionInfoProvider: jest.fn(),
    trackSearch: jest.fn((searchDescriptor) => () => {}),
    destroy: jest.fn(),
    onRefresh$: new Subject(),
    refresh: jest.fn(),
    cancel: jest.fn(),
    isStored: jest.fn(),
    isRestore: jest.fn(),
    save: jest.fn(),
    isCurrentSession: jest.fn(),
    getSearchOptions: jest.fn(),
  };
}
