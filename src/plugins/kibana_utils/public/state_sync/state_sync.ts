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
import { BaseState } from '../../common/state_containers';
import { applyDiff } from '../state_management/utils/diff_object';

/**
 * @public
 */
export type StopSyncStateFnType = () => void;
/**
 * @public
 */
export type StartSyncStateFnType = () => void;

/**
 * @public
 */
export interface ISyncStateRef<stateStorage extends IStateStorage = IStateStorage> {
  /**
   * stop state syncing
   */
  stop: StopSyncStateFnType;
  /**
   * start state syncing
   */
  start: StartSyncStateFnType;
}

/**
 * Utility for syncing application state wrapped in state container
 * with some kind of storage (e.g. URL)
 *
 * Go {@link https://github.com/elastic/kibana/tree/master/src/plugins/kibana_utils/docs/state_sync | here} for a complete guide and examples.
 *
 * @example
 *
 * the simplest use case
 * ```ts
 * const stateStorage = createKbnUrlStateStorage();
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage
 * });
 * ```
 *
 * @example
 * conditionally configuring sync strategy
 * ```ts
 * const stateStorage = createKbnUrlStateStorage({useHash: config.get('state:stateContainerInSessionStorage')})
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage
 * });
 * ```
 *
 * @example
 * implementing custom sync strategy
 * ```ts
 * const localStorageStateStorage = {
 *   set: (storageKey, state) => localStorage.setItem(storageKey, JSON.stringify(state)),
 *   get: (storageKey) => localStorage.getItem(storageKey) ? JSON.parse(localStorage.getItem(storageKey)) : null
 * };
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage: localStorageStateStorage
 * });
 * ```
 *
 * @example
 * transforming state before serialising
 *  Useful for:
 *  * Migration / backward compatibility
 *  * Syncing part of state
 *  * Providing default values
 * ```ts
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
 * ```
 *
 * @param - syncing config {@link IStateSyncConfig}
 * @returns - {@link ISyncStateRef}
 * @public
 */
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
    if (newState) {
      // apply only real differences to new state
      const mergedState = { ...oldState } as State;
      // merges into 'mergedState' all differences from newState,
      // but leaves references if they are deeply the same
      const diff = applyDiff(mergedState, newState);

      if (diff.keys.length > 0) {
        stateContainer.set(mergedState);
      }
    } else if (oldState !== newState) {
      // empty new state case
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

      subscriptions.forEach((s) => s.unsubscribe());
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
 * @example
 * sync multiple different sync configs
 * ```ts
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
 * ```
 * @param stateSyncConfigs - Array of {@link IStateSyncConfig} to sync
 */
export function syncStates(stateSyncConfigs: Array<IStateSyncConfig<any>>): ISyncStateRef {
  const syncRefs = stateSyncConfigs.map((config) => syncState(config));
  return {
    stop: () => {
      syncRefs.forEach((s) => s.stop());
    },
    start: () => {
      syncRefs.forEach((s) => s.start());
    },
  };
}
