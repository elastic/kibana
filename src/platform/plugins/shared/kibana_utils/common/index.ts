/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @deprecated Import common utilities from `@kbn/kibana-utils-common`.
 */
export type {
  BaseState,
  BaseStateContainer,
  Comparator,
  Connect,
  CreateStateContainerOptions,
  Dispatch,
  EnsurePureSelector,
  EnsurePureTransition,
  Get,
  GetMigrationFunctionObjectFn,
  KibanaServerError,
  MapStateToProps,
  Middleware,
  MigrateFunction,
  MigrateFunctionsObject,
  PersistableState,
  PersistableStateDefinition,
  PersistableStateMigrateFn,
  PersistableStateService,
  PureSelector,
  PureSelectorToSelector,
  PureSelectorsToSelectors,
  PureTransition,
  Reducer,
  ReduxLikeStateContainer,
  Selector,
  Set,
  StateContainer,
  UnboxState,
  VersionedState,
} from '@kbn/kibana-utils-common';
export {
  AbortError,
  AbortReason,
  CharacterNotAllowedInField,
  Defer,
  DuplicateField,
  InvalidJSONProperty,
  KbnError,
  SavedFieldNotFound,
  SavedFieldTypeInvalidForAgg,
  SavedObjectNotFound,
  abortSignalToPromise,
  calculateObjectHash,
  createGetterSetter,
  createStateContainer,
  defaultFreeze,
  defer,
  distinctUntilChangedWithInitialValue,
  fieldWildcardFilter,
  fieldWildcardMatcher,
  makeRegEx,
  mergeMigrationFunctionMaps,
  migrateToLatest,
  now,
  of,
  replaceUrlHashQuery,
  setStateToKbnUrl,
  url,
} from '@kbn/kibana-utils-common';
