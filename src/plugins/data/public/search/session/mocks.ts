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

import { BehaviorSubject, Subject } from 'rxjs';
import { ISessionsClient } from './sessions_client';
import { ISessionService } from './session_service';
import { SessionState } from './session_state';

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
    state$: new BehaviorSubject<SessionState>(SessionState.None).asObservable(),
    setSearchSessionInfoProvider: jest.fn(),
    trackSearch: jest.fn((searchDescriptor) => () => {}),
    destroy: jest.fn(),
    onRefresh$: new Subject(),
    refresh: jest.fn(),
    cancel: jest.fn(),
    isStored: jest.fn(),
    isRestore: jest.fn(),
    save: jest.fn(),
  };
}
