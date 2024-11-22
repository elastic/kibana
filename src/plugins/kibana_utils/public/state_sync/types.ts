/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseState, BaseStateContainer } from '../../common/state_containers/types';
import { IStateStorage } from './state_sync_state_storage';

/**
 * Extension of {@link BaseStateContainer} with one constraint: set state should handle `null` as incoming state
 * @remarks
 * State container for `stateSync()` have to accept `null`
 * for example, `set()` implementation could handle null and fallback to some default state
 * this is required to handle edge case, when state in storage becomes empty and syncing is in progress.
 * State container will be notified about about storage becoming empty with null passed in.
 * @public
 */
export interface INullableBaseStateContainer<State extends BaseState>
  extends BaseStateContainer<State> {
  set: (state: State | null) => void;
}

/**
 * Config for setting up state syncing with {@link stateSync}
 * @typeParam State - State shape to sync to storage, has to extend {@link BaseState}
 * @typeParam StateStorage - used state storage to sync state with
 * @public
 */
export interface IStateSyncConfig<
  State extends BaseState,
  StateStorage extends IStateStorage = IStateStorage
> {
  /**
   * Storage key to use for syncing,
   * e.g. storageKey '_a' should sync state to ?_a query param
   */
  storageKey: string;
  /**
   * State container to keep in sync with storage, have to implement {@link INullableBaseStateContainer} interface
   * We encourage to use {@link BaseStateContainer} as a state container,
   * but it is also possible to implement own custom container for advanced use cases
   */
  stateContainer: INullableBaseStateContainer<State>;
  /**
   * State storage to use,
   * State storage is responsible for serialising / deserialising and persisting / retrieving stored state
   *
   * There are common strategies already implemented:
   * see {@link IKbnUrlStateStorage}
   * which replicate what State (AppState, GlobalState) in legacy world did
   *
   */
  stateStorage: StateStorage;
}
