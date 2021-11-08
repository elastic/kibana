/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * State syncing utilities are a set of helpers for syncing your application state
 * with browser URL or browser storage.
 *
 * They are designed to work together with {@link https://github.com/elastic/kibana/tree/main/src/plugins/kibana_utils/docs/state_containers | state containers}. But state containers are not required.
 *
 * State syncing utilities include:
 *
 * *{@link syncState} util which:
 *   * Subscribes to state changes and pushes them to state storage.
 *   * Optionally subscribes to state storage changes and pushes them to state.
 *   * Two types of storages compatible with `syncState`:
 *   * {@link IKbnUrlStateStorage} - Serializes state and persists it to URL's query param in rison or hashed format.
 * Listens for state updates in the URL and pushes them back to state.
 *   * {@link ISessionStorageStateStorage} - Serializes state and persists it to browser storage.
 *
 * Refer {@link https://github.com/elastic/kibana/tree/main/src/plugins/kibana_utils/docs/state_sync | here} for a complete guide and examples.
 * @packageDocumentation
 */

export type {
  IKbnUrlStateStorage,
  ISessionStorageStateStorage,
  IStateStorage,
} from './state_sync_state_storage';
export {
  createSessionStorageStateStorage,
  createKbnUrlStateStorage,
} from './state_sync_state_storage';
export type { IStateSyncConfig, INullableBaseStateContainer } from './types';
export type { StopSyncStateFnType, StartSyncStateFnType, ISyncStateRef } from './state_sync';
export { syncState, syncStates } from './state_sync';
