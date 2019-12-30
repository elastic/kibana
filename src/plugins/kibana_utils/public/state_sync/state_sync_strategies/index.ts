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

import { createBrowserHistory } from 'history';
import { ISyncStrategy } from './types';
import { createKbnUrlSyncStrategy } from './create_kbn_url_sync_strategy';
import { createSessionStorageSyncStrategy } from './create_session_storage_sync_strategy';

// strategies provided out of the box
enum SyncStrategy {
  KbnUrl,
  KbnHashedUrl,
  SessionStorage,
}

const history = createBrowserHistory(); // share the same instance
const syncStrategies = {
  [SyncStrategy.KbnUrl]: createKbnUrlSyncStrategy({ useHash: false, history }),
  [SyncStrategy.KbnHashedUrl]: createKbnUrlSyncStrategy({ useHash: true, history }),
  [SyncStrategy.SessionStorage]: createSessionStorageSyncStrategy(),
  // SyncStrategies: LocalStorage, es, somewhere else...
};

function isSyncStrategy(
  syncStrategy: SyncStrategy | ISyncStrategy | void
): syncStrategy is ISyncStrategy {
  return typeof syncStrategy === 'object';
}

export {
  isSyncStrategy,
  ISyncStrategy,
  SyncStrategy,
  syncStrategies,
  createKbnUrlSyncStrategy,
  createSessionStorageSyncStrategy,
};
