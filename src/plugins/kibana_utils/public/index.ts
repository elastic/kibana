/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'src/core/public';
import { KibanaUtilsPublicPlugin } from './plugin';

// TODO: https://github.com/elastic/kibana/issues/109893
/* eslint-disable @kbn/eslint/no_export_all */

export type { Get, Set, UiComponent, UiComponentInstance } from '../common';
export {
  AbortError,
  abortSignalToPromise,
  calculateObjectHash,
  defer,
  Defer,
  fieldWildcardFilter,
  fieldWildcardMatcher,
  of,
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
export type {
  IStateSyncConfig,
  ISyncStateRef,
  IKbnUrlStateStorage,
  INullableBaseStateContainer,
  ISessionStorageStateStorage,
  StartSyncStateFnType,
  StopSyncStateFnType,
} from './state_sync';
export {
  syncState,
  syncStates,
  createKbnUrlStateStorage,
  createSessionStorageStateStorage,
} from './state_sync';
export type { Configurable, CollectConfigProps } from './ui';
export {
  removeQueryParam,
  redirectWhenMissing,
  getQueryParams,
  createQueryParamsObservable,
  createHistoryObservable,
  createQueryParamObservable,
} from './history';
export { applyDiff } from './state_management/utils/diff_object';
export type { StartServicesGetter } from './core/create_start_service_getter';
export { createStartServicesGetter } from './core/create_start_service_getter';

export type { KibanaUtilsSetup } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new KibanaUtilsPublicPlugin(initializerContext);
}
