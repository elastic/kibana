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

import { EMPTY, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import defaultComparator from 'fast-deep-equal';
import { IStateSyncConfig } from './types';
import { IStateStorage } from './state_sync_state_storage';
import { distinctUntilChangedWithInitialValue } from '../../common';
import { BaseState } from '../state_containers';

/**
 * Utility for syncing application state wrapped in state container
 * with some kind of storage (e.g. URL)
 *
 * Examples:
 *
 * 1. the simplest use case
 * const stateStorage = createKbnUrlStateStorage();
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage
 * });
 *
 * 2. conditionally configuring sync strategy
 * const stateStorage = createKbnUrlStateStorage({useHash: config.get('state:stateContainerInSessionStorage')})
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage
 * });
 *
 * 3. implementing custom sync strategy
 * const localStorageStateStorage = {
 *   set: (storageKey, state) => localStorage.setItem(storageKey, JSON.stringify(state)),
 *   get: (storageKey) => localStorage.getItem(storageKey) ? JSON.parse(localStorage.getItem(storageKey)) : null
 * };
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage: localStorageStateStorage
 * });
 *
 * 4. Transform state before serialising
 *  Useful for:
 *  * Migration / backward compatibility
 *  * Syncing part of state
 *  * Providing default values
 * const stateToStorage = (s) => ({ tab: s.tab });
 * syncState({
 *   storageKey: '_s',
 *   stateContainer: {
 *     get: () => stateToStorage(stateContainer.get()),
 *     set: stateContainer.set(({ tab }) => ({ ...stateContainer.get(), tab }),
 *     state$: stateContainer.state$.pipe(map(stateToStorage))
 *   },
 *   stateStorage
 * });
 *
 * Caveats:
 *
 * 1. It is responsibility of consumer to make sure that initial app state and storage are in sync before starting syncing
 *    No initial sync happens when syncState() is called
 */
export type StopSyncStateFnType = () => void;
export type StartSyncStateFnType = () => void;
export interface ISyncStateRef<stateStorage extends IStateStorage = IStateStorage> {
  // stop syncing state with storage
  stop: StopSyncStateFnType;
  // start syncing state with storage
  start: StartSyncStateFnType;
}
export function syncState<
  State extends BaseState,
  StateStorage extends IStateStorage = IStateStorage
>({
  storageKey,
  stateStorage,
  stateContainer,
}: IStateSyncConfig<State, IStateStorage>): ISyncStateRef {
  const subscriptions: Subscription[] = [];

  const updateState = () => {
    const newState = stateStorage.get<State>(storageKey);
    const oldState = stateContainer.get();
    if (!defaultComparator(newState, oldState)) {
      stateContainer.set(newState);
    }
  };

  const updateStorage = () => {
    const newStorageState = stateContainer.get();
    const oldStorageState = stateStorage.get<State>(storageKey);
    if (!defaultComparator(newStorageState, oldStorageState)) {
      stateStorage.set(storageKey, newStorageState);
    }
  };

  const onStateChange$ = stateContainer.state$.pipe(
    distinctUntilChangedWithInitialValue(stateContainer.get(), defaultComparator),
    tap(() => updateStorage())
  );

  const onStorageChange$ = stateStorage.change$
    ? stateStorage.change$(storageKey).pipe(
        distinctUntilChangedWithInitialValue(stateStorage.get(storageKey), defaultComparator),
        tap(() => {
          updateState();
        })
      )
    : EMPTY;

  return {
    stop: () => {
      // if stateStorage has any cancellation logic, then run it
      if (stateStorage.cancel) {
        stateStorage.cancel();
      }

      subscriptions.forEach(s => s.unsubscribe());
      subscriptions.splice(0, subscriptions.length);
    },
    start: () => {
      if (subscriptions.length > 0) {
        throw new Error("syncState: can't start syncing state, when syncing is in progress");
      }
      subscriptions.push(onStateChange$.subscribe(), onStorageChange$.subscribe());
    },
  };
}

/**
 * multiple different sync configs
 * syncStates([
 *   {
 *     storageKey: '_s1',
 *     stateStorage: stateStorage1,
 *     stateContainer: stateContainer1,
 *   },
 *   {
 *     storageKey: '_s2',
 *     stateStorage: stateStorage2,
 *     stateContainer: stateContainer2,
 *   },
 * ]);
 * @param stateSyncConfigs - Array of IStateSyncConfig to sync
 */
export function syncStates(stateSyncConfigs: Array<IStateSyncConfig<any>>): ISyncStateRef {
  const syncRefs = stateSyncConfigs.map(config => syncState(config));
  return {
    stop: () => {
      syncRefs.forEach(s => s.stop());
    },
    start: () => {
      syncRefs.forEach(s => s.start());
    },
  };
}
