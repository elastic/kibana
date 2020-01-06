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

import { Subscription } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import defaultComparator from 'fast-deep-equal';
import { IStateSyncConfig } from './types';
import { ISyncStrategy } from './state_sync_strategies';
import { distinctUntilChangedWithInitialValue } from '../../common';

/**
 * Utility for syncing application state wrapped in state container
 * with some kind of storage (e.g. URL)
 *
 * Examples:
 *
 * 1. the simplest use case
 * const syncStrategy = createKbnUrlSyncStrategy();
 * syncState({
 *   syncKey: '_s',
 *   stateContainer,
 *   syncStrategy
 * });
 *
 * 2. conditionally configuring sync strategy
 * const syncStrategy = createKbnUrlSyncStrategy({useHash: config.get('state:stateContainerInSessionStorage')})
 * syncState({
 *   syncKey: '_s',
 *   stateContainer,
 *   syncStrategy
 * });
 *
 * 3. implementing custom sync strategy
 * const localStorageSyncStrategy = {
 *   toStorage: (syncKey, state) => localStorage.setItem(syncKey, JSON.stringify(state)),
 *   fromStorage: (syncKey) => localStorage.getItem(syncKey) ? JSON.parse(localStorage.getItem(syncKey)) : null
 * };
 * syncState({
 *   syncKey: '_s',
 *   stateContainer,
 *   syncStrategy: localStorageSyncStrategy
 * });
 *
 * 4. Transform state before serialising
 *  Useful for:
 *  * Migration / backward compatibility
 *  * Syncing part of state
 *  * Providing default values
 * const stateToStorage = (s) => ({ tab: s.tab });
 * syncState({
 *   syncKey: '_s',
 *   stateContainer: {
 *     get: () => stateToStorage(stateContainer.get()),
 *     set: stateContainer.set(({ tab }) => ({ ...stateContainer.get(), tab }),
 *     state$: stateContainer.state$.pipe(map(stateToStorage))
 *   },
 *   syncStrategy
 * });
 *
 * Caveats:
 *
 * 1. It is responsibility of consumer to make sure that initial app state and storage are in sync before starting syncing
 *    No initial sync happens when syncState() is called
 *
 * 2. Syncing withing sync state is asynchronous
 */
export type StopSyncStateFnType = () => void;
export interface ISyncStateRef<SyncStrategy extends ISyncStrategy = ISyncStrategy> {
  // stop syncing state with storage
  stop: StopSyncStateFnType;
}
export function syncState<State = unknown, SyncStrategy extends ISyncStrategy = ISyncStrategy>(
  stateSyncConfig: IStateSyncConfig<State, SyncStrategy>
): ISyncStateRef {
  const subscriptions: Subscription[] = [];
  let isSyncing = false;

  start();

  return {
    stop,
  };

  function stop() {
    isSyncing = false;
    subscriptions.forEach(s => s.unsubscribe());
  }

  function start() {
    if (isSyncing) {
      throw new Error("SyncState: can't start syncing state, when syncing is already in progress");
    }
    isSyncing = true;

    const { toStorage, fromStorage, storageChange$ } = stateSyncConfig.syncStrategy;

    const updateState = async (): Promise<void> => {
      const storageState = await fromStorage<State>(stateSyncConfig.syncKey);
      if (
        isSyncing &&
        storageState &&
        !defaultComparator(storageState, stateSyncConfig.stateContainer.get())
      ) {
        stateSyncConfig.stateContainer.set(storageState);
      }
    };

    const updateStorage = async (): Promise<void> => {
      const newStorageState = stateSyncConfig.stateContainer.get();
      const oldStorageState = await fromStorage<State>(stateSyncConfig.syncKey);
      if (isSyncing && !defaultComparator(newStorageState, oldStorageState)) {
        await toStorage(stateSyncConfig.syncKey, newStorageState);
      }
    };

    // subscribe to state and storage updates
    subscriptions.push(
      stateSyncConfig.stateContainer.state$
        .pipe(
          distinctUntilChangedWithInitialValue(
            stateSyncConfig.stateContainer.get(),
            defaultComparator
          ),
          concatMap(() => updateStorage())
        )
        .subscribe()
    );
    if (storageChange$) {
      subscriptions.push(
        storageChange$(stateSyncConfig.syncKey)
          .pipe(
            distinctUntilChangedWithInitialValue(
              fromStorage(stateSyncConfig.syncKey),
              defaultComparator
            ),
            concatMap(() => updateState())
          )
          .subscribe()
      );
    }
  }
}

/**
 * 6. multiple different sync configs
 * syncStates([
 *   {
 *     syncKey: '_s1',
 *     syncStrategy: syncStrategy1,
 *     stateContainer: stateContainer1,
 *   },
 *   {
 *     syncKey: '_s2',
 *     syncStrategy: syncStrategy2,
 *     stateContainer: stateContainer2,
 *   },
 * ]);
 * @param stateSyncConfigs - Array of IStateSyncConfig to sync
 */
export function syncStates(stateSyncConfigs: Array<IStateSyncConfig<any>>): ISyncStateRef {
  const syncs = stateSyncConfigs.map(config => syncState(config));

  function stop() {
    syncs.forEach(sync => sync.stop());
  }

  return {
    stop,
  };
}
