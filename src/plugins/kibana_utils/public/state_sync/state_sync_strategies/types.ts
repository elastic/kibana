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

/**
 * Sync strategy is responsible for serialising / deserialising and persisting / retrieving stored state
 * 2 strategies available now out of the box, which replicate what State (AppState, GlobalState) implemented:
 *
 * SyncStrategy.Url: the same as old persisting of expanded state in rison format to the url
 * SyncStrategy.HashedUrl: the same as old persisting of hashed state using sessionStorage for storing expanded state
 *
 * Possible to provide own custom SyncStrategy by implementing ISyncStrategy
 *
 * SyncStrategy.Url is default
 */
import { Observable } from 'rxjs';

/**
 * Any SyncStrategy have to implement ISyncStrategy interface
 * SyncStrategy is responsible for:
 * * state serialisation / deserialization
 * * persisting to and retrieving from storage
 *
 * For an example take a look at already implemented URL sync strategies
 */
export interface ISyncStrategy {
  /**
   * Take in a state object, should serialise and persist
   */
  toStorage: <State>(syncKey: string, state: State, opts?: { replace: boolean }) => Promise<void>;

  /**
   * Should retrieve state from the storage and deserialize it
   */
  fromStorage: <State = unknown>(
    syncKey: string,
    opts?: { isRestoringInitialState: boolean }
  ) => Promise<State | null>;

  /**
   * Should notify when the storage has changed
   */
  storageChange$?: <State = unknown>(syncKey: string) => Observable<State | null>;

  /**
   * Optional helper method - should retrieve state from the storage and deserialize it synchronously
   */
  fromStorageSync?: <State = unknown>(
    syncKey: string,
    opts?: { isRestoringInitialState: boolean }
  ) => State | null;

  /**
   * Optional helper method - take in a state object, should serialise and persist it synchronously
   */
  toStorageSync?: <State>(syncKey: string, state: State, opts?: { replace: boolean }) => void;
}
