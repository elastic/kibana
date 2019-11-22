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

import { Observable, Subscription } from 'rxjs';
import { IStorage, IStorageWrapper, Storage } from '../storage';
import { updateHash, readStateUrl, generateStateUrl } from '../url';

export type BaseState = Record<string, unknown>;

export interface IState<State extends BaseState = BaseState> {
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
}

export interface StateSyncConfig {
  syncToUrl?: boolean;
  syncToStorage?: boolean;
  storageProvider?: IStorage;
  watchUrl?: boolean;
}

function updateStorage<T extends BaseState>(state: T, storage: IStorageWrapper): void {
  // TODO
  return;
}

export function syncState(
  states: Record<string, IState[]>,
  {
    syncToUrl = true,
    syncToStorage = true,
    storageProvider = window.sessionStorage,
    watchUrl = false,
  }: StateSyncConfig = {}
) {
  const subscriptions: Subscription[] = [];
  const storage: IStorageWrapper = new Storage(storageProvider);

  const keysToStateIndex: Map<string, number> = new Map();
  const queryKeys: string[] = [];
  const statesList: IState[] = Object.entries(states).flatMap(([key, vals]) => {
    vals.forEach(v => queryKeys.push(key));
    return vals;
  });

  const handleEvent = (stateIndex: number, state: BaseState) => {
    if (syncToUrl) {
      const urlState = readStateUrl();
      const queryKey = queryKeys[stateIndex];
      urlState[queryKey] = {
        ...urlState[queryKey],
        ...state,
      };
      updateHash(generateStateUrl(urlState));
    }

    if (syncToStorage) {
      updateStorage(state, storage);
    }
  };

  statesList.forEach((state, stateIndex) => {
    Object.keys(state.get()).forEach(key => {
      keysToStateIndex.set(key, stateIndex);
    });
    subscriptions.push(
      state.state$.subscribe((val: BaseState) => {
        handleEvent(stateIndex, val);
      })
    );
  });

  if (watchUrl) {
    // TODO subscribe to url updates and push updates back to the service
  }

  return () => {
    subscriptions.forEach(sub => sub.unsubscribe());
    // TODO unsubscribe url watch
  };
}
