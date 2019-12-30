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

import { BaseStateContainer } from '../state_containers/types';
import { SyncStrategy, ISyncStrategy } from './state_sync_strategies';

export interface IStateSyncConfig<State = any> {
  /**
   * Storage key to use for syncing,
   * e.g. syncKey '_a' should sync state to ?_a query param
   */
  syncKey: string;
  /**
   * State container to keep in sync with storage, have to implement BaseStateContainer interface
   * The idea is that ./state_containers/ should be used as a state container,
   * but it is also possible to implement own custom container for advanced use cases
   */
  stateContainer: BaseStateContainer<State>;
  /**
   * Sync strategy to use,
   * Sync strategy is responsible for serialising / deserialising and persisting / retrieving stored state
   * 2 strategies available now out of the box, which replicate what State (AppState, GlobalState) implemented:
   *
   * SyncStrategy.Url: the same as old persisting of expanded state in rison format to the url
   * SyncStrategy.HashedUrl: the same as old persisting of hashed state using sessionStorage for storing expanded state
   *
   * Possible to provide own custom SyncStrategy by implementing ISyncStrategy
   *
   * SyncStrategy.KbnUrl is default
   */
  syncStrategy?: SyncStrategy | ISyncStrategy;

  /**
   * During app bootstrap we could have default app state and data in storage to be out of sync,
   * initialTruthSource indicates who's values to consider as source of truth
   *
   * InitialTruthSource.StateContainer - Application state take priority over storage state
   * InitialTruthSource.Storage (default) - Storage state take priority over Application state
   * InitialTruthSource.None - skip initial syncing do nothing
   */
  initialTruthSource?: InitialTruthSource;
}

/**
 * During app bootstrap we could have default app state and data in storage to be out of sync,
 * initialTruthSource indicates who's values to consider as source of truth
 *
 * InitialTruthSource.StateContainer - Application state take priority over storage state
 * InitialTruthSource.Storage (default) - Storage state take priority over Application state
 * InitialTruthSource.None - skip initial syncing do nothing
 */
export enum InitialTruthSource {
  StateContainer,
  Storage,
  None,
}
