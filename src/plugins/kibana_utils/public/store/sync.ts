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
import { createUrlControls, readStateUrl, generateStateUrl } from '../url';

export type BaseState = Record<string, unknown>;

export interface IState<State extends BaseState = BaseState> {
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
}

export interface StateSyncConfig {
  syncToUrl: boolean;
  syncToStorage: boolean;
  storageProvider: IStorage;
  initialTruthSource: InitialTruthSource;
}

export enum InitialTruthSource {
  State,
  // eslint-disable-next-line no-shadow
  Storage,
  None,
}

export function syncState(
  states: Record<string, IState>,
  {
    syncToUrl = true,
    syncToStorage = true,
    storageProvider = window.sessionStorage,
    initialTruthSource = InitialTruthSource.Storage,
  }: Partial<StateSyncConfig> = {}
) {
  const subscriptions: Subscription[] = [];
  const storage: IStorageWrapper = new Storage(storageProvider);
  const { update: updateUrl, listen: listenUrl } = createUrlControls();

  const keyToState = new Map<string, IState>();
  const stateToKey = new Map<IState, string>();

  Object.entries(states).forEach(([key, state]) => {
    keyToState.set(key, state);
    stateToKey.set(state, key);
  });

  let ignoreStateUpdate = false;
  let ignoreStorageUpdate = false;

  const updateState = (state$: IState): boolean => {
    if (ignoreStateUpdate) return false;
    const update = () => {
      if (syncToUrl) {
        const urlState = readStateUrl();
        const key = stateToKey.get(state$);
        if (!key || !urlState[key]) {
          ignoreStorageUpdate = false;
          return false;
        }

        if (key && urlState[key]) {
          state$.set(urlState[key]);
          return true;
        }
      }

      return false;
    };

    ignoreStorageUpdate = true;
    const updated = update();
    ignoreStorageUpdate = false;
    return updated;
  };

  const updateStorage = (state$: IState, { replace = false } = {}): boolean => {
    if (ignoreStorageUpdate) return false;

    const update = () => {
      if (syncToUrl) {
        const urlState = readStateUrl();
        const key = stateToKey.get(state$);
        if (!key) return false;
        urlState[key] = state$.get();
        updateUrl(generateStateUrl(urlState), replace);
        return true;
      }

      return false;
    };

    ignoreStateUpdate = true;
    const hasUpdated = update();
    ignoreStateUpdate = false;
    return hasUpdated;
  };

  Object.values(states).forEach(state => {
    if (initialTruthSource === InitialTruthSource.Storage) {
      const hasUpdated = updateState(state);
      // if there is nothing by state key in storage
      // then we should fallback and consider state source of truth
      if (!hasUpdated) {
        updateStorage(state, { replace: true });
      }
    } else if (initialTruthSource === InitialTruthSource.State) {
      updateStorage(state);
    }
  });

  subscriptions.push(
    ...Object.values(states).map(s =>
      s.state$.subscribe(() => {
        updateStorage(s);
      })
    )
  );

  let unlistenUrlChange: () => void;
  if (syncToUrl) {
    unlistenUrlChange = listenUrl(() => {
      Object.values(states).forEach(state$ => updateState(state$));
    });
  }

  return () => {
    keyToState.clear();
    stateToKey.clear();
    subscriptions.forEach(sub => sub.unsubscribe());
    if (unlistenUrlChange) unlistenUrlChange();
  };
}
