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
import { InitialTruthSource, IStateSyncConfig } from './types';
import { isSyncStrategy, syncStrategies, SyncStrategy } from './state_sync_strategies';
import { distinctUntilChangedWithInitialValue } from '../../common';

/**
 * Utility for syncing application state wrapped in state container
 * with some kind of storage (e.g. URL)
 * * 1. the simplest use case
 * syncState({
 *   syncKey: '_s',
 *   stateContainer,
 * });
 *
 * 2. conditionally picking sync strategy
 * syncState({
 *   syncKey: '_s',
 *   stateContainer,
 *   syncStrategy: config.get('state:stateContainerInSessionStorage') ? SyncStrategy.KbnHashedUrl : SyncStrategy.KbnUrl
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
 * 4. syncing only part of state
 * const stateToStorage = (s) => ({ tab: s.tab });
 * syncState({
 *   syncKey: '_s',
 *   stateContainer: {
 *     get: () => stateToStorage(stateContainer.get()),
 *     set: stateContainer.set(({ tab }) => ({ ...stateContainer.get(), tab }),
 *       state$: stateContainer.state$.pipe(map(stateToStorage))
 *   }
 * });
 *
 * 5. transform state before serialising
 * this could be super useful for backward compatibility
 * const stateToStorage = (s) => ({ t: s.tab });
 * syncState({
 *   syncKey: '_s',
 *   stateContainer: {
 *     get: () => stateToStorage(stateContainer.get()),
 *     set: ({ t }) => stateContainer.set({ ...stateContainer.get(), tab: t }),
 *     state$: stateContainer.state$.pipe(map(stateToStorage))
 *   }
 * });
 *
 * 6. multiple different sync configs
 * const stateAToStorage = s => ({ t: s.tab });
 * const stateBToStorage = s => ({ f: s.fieldFilter, i: s.indexedFieldTypeFilter, l: s.scriptedFieldLanguageFilter });
 * syncState([
 *   {
 *     syncKey: '_a',
 *     syncStrategy: SyncStrategy.Url,
 *     stateContainer: {
 *       get: () => stateAToStorage(stateContainer.get()),
 *       set: s => stateContainer.set(({ ...stateContainer.get(), tab: s.t })),
 *       state$: stateContainer.state$.pipe(map(stateAToStorage))
 *     },
 *   },
 *   {
 *     syncKey: '_b',
 *     syncStrategy: SyncStrategy.HashedUrl,
 *     stateContainer: {
 *       get: () => stateBToStorage(stateContainer.get()),
 *       set: s => stateContainer.set({
 *         ...stateContainer.get(),
 *         fieldFilter: s.f || '',
 *         indexedFieldTypeFilter: s.i || '',
 *         scriptedFieldLanguageFilter: s.l || ''
 *       }),
 *       state$: stateContainer.state$.pipe(map(stateBToStorage))
 *     },
 *   },
 * ]);
 */
export type StartSyncStateFnType = () => Promise<void>; // resolves when initial state is rehydrated
export type StopSyncStateFnType = () => void;
export function syncState(
  config: IStateSyncConfig[] | IStateSyncConfig
): [StartSyncStateFnType, StopSyncStateFnType] {
  const stateSyncConfigs = Array.isArray(config) ? config : [config];
  const subscriptions: Subscription[] = [];
  let isSyncing = false;
  return [start, stop];

  function stop() {
    isSyncing = false;
    subscriptions.forEach(s => s.unsubscribe());
  }

  async function start() {
    if (isSyncing) {
      throw new Error("SyncState: can't start syncing state, when syncing is already in progress");
    }
    isSyncing = true;

    for (const stateSyncConfig of stateSyncConfigs) {
      const { toStorage, fromStorage, storageChange$ } = isSyncStrategy(
        stateSyncConfig.syncStrategy
      )
        ? stateSyncConfig.syncStrategy
        : syncStrategies[stateSyncConfig.syncStrategy || SyncStrategy.KbnUrl];

      // returned boolean indicates if update happen
      const updateState = async (): Promise<boolean> => {
        const storageState = await fromStorage(stateSyncConfig.syncKey);

        if (!storageState) {
          return false;
        }

        if (
          isSyncing &&
          storageState &&
          !defaultComparator(storageState, stateSyncConfig.stateContainer.get())
        ) {
          stateSyncConfig.stateContainer.set(storageState);
        }

        return true;
      };

      // returned boolean indicates if update happen
      const updateStorage = async ({ replace = false } = {}): Promise<boolean> => {
        const newStorageState = stateSyncConfig.stateContainer.get();
        const oldStorageState = await fromStorage(stateSyncConfig.syncKey);
        if (isSyncing && !defaultComparator(newStorageState, oldStorageState)) {
          await toStorage(stateSyncConfig.syncKey, newStorageState, { replace });
        }

        return true;
      };

      // initial syncing of stateContainer state and storage state
      const initialTruthSource = stateSyncConfig.initialTruthSource ?? InitialTruthSource.Storage;
      if (initialTruthSource === InitialTruthSource.Storage) {
        const hasUpdated = await updateState();
        // if there is nothing by state key in storage
        // then we should fallback and consider state source of truth
        if (!hasUpdated) {
          await updateStorage({ replace: true });
        }
      } else if (initialTruthSource === InitialTruthSource.StateContainer) {
        await updateStorage({ replace: true });
      }

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
              concatMap(t => {
                return updateState().then(hasUpdated => {
                  // if there is nothing by state key in storage
                  // then we should fallback and consider state source of truth
                  if (!hasUpdated) {
                    return updateStorage({ replace: true });
                  }
                });
              })
            )
            .subscribe()
        );
      }
    }
  }
}
