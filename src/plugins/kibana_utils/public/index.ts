/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export {
  AbortError,
  abortSignalToPromise,
  calculateObjectHash,
  defer,
  Defer,
  fieldWildcardFilter,
  fieldWildcardMatcher,
  Get,
  getCombinedAbortSignal,
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
  withNotifyOnErrors,
  replaceUrlQuery,
  replaceUrlHashQuery,
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
export { removeQueryParam, redirectWhenMissing, getQueryParams } from './history';
export { applyDiff } from './state_management/utils/diff_object';
export { createStartServicesGetter, StartServicesGetter } from './core/create_start_service_getter';

/** dummy plugin, we just want kibanaUtils to have its own bundle */
export function plugin() {
  return new (class KibanaUtilsPlugin {
    setup() {}
    start() {}
  })();
}
