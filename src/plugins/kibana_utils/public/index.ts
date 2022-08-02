/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { KibanaUtilsPublicPlugin } from './plugin';

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
export type { StartServicesGetter } from './core';
export { createStartServicesGetter } from './core';
export type { KibanaServerError } from '../common/errors';
export {
  KbnError,
  CharacterNotAllowedInField,
  SavedFieldNotFound,
  SavedObjectNotFound,
  SavedFieldTypeInvalidForAgg,
  InvalidJSONProperty,
  DuplicateField,
} from '../common/errors';
export {
  RenderCompleteListener,
  RenderCompleteDispatcher,
  dispatchRenderComplete,
  dispatchRenderStart,
} from './render_complete';
export { ResizeChecker } from './resize_checker';
export type {
  BaseState,
  BaseStateContainer,
  StateContainer,
  ReduxLikeStateContainer,
  Dispatch,
  Middleware,
  Selector,
  Comparator,
  MapStateToProps,
  Connect,
  Reducer,
  UnboxState,
  PureSelectorToSelector,
  PureSelectorsToSelectors,
  EnsurePureSelector,
  EnsurePureTransition,
  PureSelector,
  PureTransition,
  CreateStateContainerOptions,
} from '../common/state_containers';
export {
  createStateContainerReactHelpers,
  useContainerSelector,
  useContainerState,
  createStateContainer,
} from '../common/state_containers';
export type { IStorageWrapper, IStorage } from './storage';
export { Storage } from './storage';
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

export type { KibanaUtilsSetup } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new KibanaUtilsPublicPlugin(initializerContext);
}
