/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
