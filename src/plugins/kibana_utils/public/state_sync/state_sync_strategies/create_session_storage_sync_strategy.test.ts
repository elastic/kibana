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

import { ISyncStrategy } from './types';
import { createSessionStorageSyncStrategy } from './create_session_storage_sync_strategy';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';

describe('SessionStorageSyncStrategy', () => {
  let storage: StubBrowserStorage;
  let syncStrategy: ISyncStrategy;
  beforeEach(() => {
    storage = new StubBrowserStorage();
    syncStrategy = createSessionStorageSyncStrategy(storage);
  });

  it('should sync to storage', async () => {
    const state = { state: 'state' };
    await syncStrategy.toStorage('key', state);
    expect(await syncStrategy.fromStorage('key')).toEqual(state);
    expect(storage.getItem('key')).not.toBeNull();
  });

  it('should not implement storageChange$', () => {
    expect(syncStrategy.storageChange$).not.toBeDefined();
  });
});
