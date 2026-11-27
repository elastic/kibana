/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { Get, Set } from '@kbn/kibana-utils-common';
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
} from '@kbn/kibana-utils-common';
export type { StartServicesGetter } from './src/core';
export { createStartServicesGetter } from './src/core';
export type { KibanaServerError } from '@kbn/kibana-utils-common';
export {
  KbnError,
  CharacterNotAllowedInField,
  SavedFieldNotFound,
  SavedObjectNotFound,
  SavedFieldTypeInvalidForAgg,
  InvalidJSONProperty,
  DuplicateField,
} from '@kbn/kibana-utils-common';
export {
  RenderCompleteDispatcher,
  dispatchRenderComplete,
  dispatchRenderStart,
} from './src/render_complete';
export { ResizeChecker } from './src/resize_checker';
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
} from '@kbn/kibana-utils-common';
export { createStateContainer } from '@kbn/kibana-utils-common';
export {
  createStateContainerReactHelpers,
  useContainerSelector,
  useContainerState,
} from './src/state_containers';
export type { IStorageWrapper, IStorage } from './src/storage';
export { Storage } from './src/storage';
export { hashedItemStore, HashedItemStore } from './src/storage/hashed_item_store';
export { persistState, retrieveState } from './src/state_management/state_hash';
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
} from './src/state_management/url';
export type {
  IStateStorage,
  IStateSyncConfig,
  ISyncStateRef,
  IKbnUrlStateStorage,
  INullableBaseStateContainer,
  ISessionStorageStateStorage,
  StartSyncStateFnType,
  StopSyncStateFnType,
} from './src/state_sync';
export {
  syncState,
  syncStates,
  createKbnUrlStateStorage,
  createSessionStorageStateStorage,
} from './src/state_sync';
export type { Configurable, CollectConfigProps } from './src/ui';
export {
  removeQueryParam,
  redirectWhenMissing,
  getQueryParams,
  createQueryParamsObservable,
  createHistoryObservable,
  createQueryParamObservable,
} from './src/history';
export { applyDiff } from './src/state_management/utils/diff_object';
