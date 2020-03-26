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

import { BaseState, BaseStateContainer } from '../../common/state_containers/types';
import { IStateStorage } from './state_sync_state_storage';

export interface INullableBaseStateContainer<State extends BaseState>
  extends BaseStateContainer<State> {
  // State container for stateSync() have to accept "null"
  // for example, set() implementation could handle null and fallback to some default state
  // this is required to handle edge case, when state in storage becomes empty and syncing is in progress.
  // state container will be notified about about storage becoming empty with null passed in
  set: (state: State | null) => void;
}

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
   * State container to keep in sync with storage, have to implement INullableBaseStateContainer<State> interface
   * The idea is that ./state_containers/ should be used as a state container,
   * but it is also possible to implement own custom container for advanced use cases
   */
  stateContainer: INullableBaseStateContainer<State>;
  /**
   * State storage to use,
   * State storage is responsible for serialising / deserialising and persisting / retrieving stored state
   *
   * There are common strategies already implemented:
   * './state_sync_state_storage/'
   * which replicate what State (AppState, GlobalState) in legacy world did
   *
   */
  stateStorage: StateStorage;
}
