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

export {
  calculateObjectHash,
  defer,
  Defer,
  Get,
  JsonArray,
  JsonObject,
  JsonValue,
  of,
  Set,
  UiComponent,
  UiComponentInstance,
  url,
  createGetterSetter,
} from '../common';
export * from './core';
export * from '../common/errors';
export * from './field_wildcard';
export * from './render_complete';
export * from './resize_checker';
export * from '../common/state_containers';
export * from './storage';
export { hashedItemStore, HashedItemStore } from './storage/hashed_item_store';
export {
  createStateHash,
  persistState,
  retrieveState,
  isStateHash,
} from './state_management/state_hash';
export {
  hashQuery,
  hashUrl,
  unhashUrl,
  unhashQuery,
  createUrlTracker,
  createKbnUrlTracker,
  createKbnUrlControls,
  getStateFromKbnUrl,
  getStatesFromKbnUrl,
  setStateToKbnUrl,
} from './state_management/url';
export {
  syncState,
  syncStates,
  createKbnUrlStateStorage,
  createSessionStorageStateStorage,
  IStateSyncConfig,
  ISyncStateRef,
  IKbnUrlStateStorage,
  INullableBaseStateContainer,
  ISessionStorageStateStorage,
  StartSyncStateFnType,
  StopSyncStateFnType,
} from './state_sync';
export { Configurable, CollectConfigProps } from './ui';
export { removeQueryParam, redirectWhenMissing } from './history';
export { applyDiff } from './state_management/utils/diff_object';
export { createStartServicesGetter, StartServicesGetter } from './core/create_start_service_getter';

/** dummy plugin, we just want kibanaUtils to have its own bundle */
export function plugin() {
  return new (class KibanaUtilsPlugin {
    setup() {}
    start() {}
  })();
}
