/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaUtilsPublicPlugin } from './plugin';

/**
 * @deprecated Import browser utilities from `@kbn/kibana-utils-browser`.
 */
export type {
  BaseState,
  BaseStateContainer,
  CollectConfigProps,
  Comparator,
  Configurable,
  Connect,
  CreateStateContainerOptions,
  Dispatch,
  EnsurePureSelector,
  EnsurePureTransition,
  Get,
  IKbnUrlStateStorage,
  INullableBaseStateContainer,
  ISessionStorageStateStorage,
  IStateStorage,
  IStateSyncConfig,
  IStorage,
  IStorageWrapper,
  ISyncStateRef,
  KibanaServerError,
  MapStateToProps,
  Middleware,
  PureSelector,
  PureSelectorToSelector,
  PureSelectorsToSelectors,
  PureTransition,
  Reducer,
  ReduxLikeStateContainer,
  Selector,
  Set,
  StartServicesGetter,
  StartSyncStateFnType,
  StateContainer,
  StopSyncStateFnType,
  UnboxState,
} from '@kbn/kibana-utils-browser';
export {
  AbortError,
  CharacterNotAllowedInField,
  Defer,
  DuplicateField,
  HashedItemStore,
  InvalidJSONProperty,
  KbnError,
  RenderCompleteDispatcher,
  ResizeChecker,
  SavedFieldNotFound,
  SavedFieldTypeInvalidForAgg,
  SavedObjectNotFound,
  Storage,
  abortSignalToPromise,
  applyDiff,
  calculateObjectHash,
  createGetterSetter,
  createHistoryObservable,
  createKbnUrlControls,
  createKbnUrlStateStorage,
  createKbnUrlTracker,
  createQueryParamObservable,
  createQueryParamsObservable,
  createSessionStorageStateStorage,
  createStartServicesGetter,
  createStateContainer,
  createStateContainerReactHelpers,
  createUrlTracker,
  defer,
  dispatchRenderComplete,
  dispatchRenderStart,
  fieldWildcardFilter,
  fieldWildcardMatcher,
  getQueryParams,
  getStateFromKbnUrl,
  getStatesFromKbnUrl,
  hashQuery,
  hashUrl,
  hashedItemStore,
  of,
  persistState,
  redirectWhenMissing,
  removeQueryParam,
  retrieveState,
  setStateToKbnUrl,
  syncState,
  syncStates,
  unhashQuery,
  unhashUrl,
  url,
  useContainerSelector,
  useContainerState,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-browser';

export type { KibanaUtilsPublicSetup as KibanaUtilsSetup, KibanaUtilsPublicStart } from './plugin';

export function plugin() {
  return new KibanaUtilsPublicPlugin();
}
