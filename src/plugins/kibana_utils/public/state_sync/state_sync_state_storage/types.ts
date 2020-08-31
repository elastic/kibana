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

import { Observable } from 'rxjs';

/**
 * Any StateStorage have to implement IStateStorage interface
 * StateStorage is responsible for:
 * * state serialisation / deserialization
 * * persisting to and retrieving from storage
 *
 * For an example take a look at already implemented {@link IKbnUrlStateStorage} and {@link ISessionStorageStateStorage} state storages
 * @public
 */
export interface IStateStorage {
  /**
   * Take in a state object, should serialise and persist
   */
  set: <State>(key: string, state: State) => any;

  /**
   * Should retrieve state from the storage and deserialize it
   */
  get: <State = unknown>(key: string) => State | null;

  /**
   * Should notify when the stored state has changed
   */
  change$?: <State = unknown>(key: string) => Observable<State | null>;

  /**
   * Optional method to cancel any pending activity
   * {@link syncState} will call it during destroy, if it is provided by IStateStorage
   */
  cancel?: () => void;
}
