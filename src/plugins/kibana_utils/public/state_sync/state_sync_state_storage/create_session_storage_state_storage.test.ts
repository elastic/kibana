/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createSessionStorageStateStorage,
  ISessionStorageStateStorage,
} from './create_session_storage_state_storage';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';

describe('SessionStorageStateStorage', () => {
  let browserStorage: StubBrowserStorage;
  let stateStorage: ISessionStorageStateStorage;
  beforeEach(() => {
    browserStorage = new StubBrowserStorage();
    stateStorage = createSessionStorageStateStorage(browserStorage);
  });

  it('should synchronously sync to storage', () => {
    const state = { state: 'state' };
    stateStorage.set('key', state);
    expect(stateStorage.get('key')).toEqual(state);
    expect(browserStorage.getItem('key')).not.toBeNull();
  });

  it('should not implement change$', () => {
    expect(stateStorage.change$).not.toBeDefined();
  });
});
