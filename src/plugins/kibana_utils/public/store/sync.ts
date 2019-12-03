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

import { MonoTypeOperatorFunction, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, share, skip, startWith } from 'rxjs/operators';
import { createUrlControls, getStateFromUrl, setStateToUrl } from '../url';

/**
 * Configuration of StateSync utility
 * State - the interface of the form of application provided state
 * StorageState - interface of the transformed State which will be serialised into storage
 * (see toStorageMapper, fromStorageMapper)
 */
export interface IStateSyncConfig<
  State extends BaseState = BaseState,
  StorageState extends BaseState = BaseState
> {
  /**
   * Storage key to use for syncing,
   * e.g. having syncKey '_a' will sync state to ?_a query param
   */
  syncKey: string;
  /**
   * Store to keep in sync with storage, have to implement IStore interface
   * The idea is that ./store/create_store.ts should be used as a state container,
   * but it is also possible to implement own container for advanced use cases
   */
  store: IStore<State>;
  /**
   * Sync strategy to use,
   * Is responsible for where to put to / where to get from the stored state
   * 2 strategies available now, which replicate what State (AppState, GlobalState) implemented:
   *
   * SyncStrategy.Url: the same as old persisting of expanded state in rison format to url
   * SyncStrategy.HashedUrl: the same as old persisting of hashed state using sessionStorage for storing expanded state
   *
   * Possible to provide own custom SyncStrategy by implementing ISyncStrategy
   *
   * SyncStrategy.Url is default
   */
  syncStrategy?: SyncStrategy | SyncStrategyFactory;

  /**
   * These mappers are needed to transform application state to a different shape we want to store
   * Some use cases:
   *
   * 1. Want to pick some specific parts of State to store.
   *
   * Having state in shape of:
   * type State = {a: string, b: string};
   *
   * Passing toStorageMapper as:
   * toStorageMapper: (state) => ({b: state.b})
   *
   * Will result in storing only b
   *
   * 2. Original state keys are too long and we want to give them a shorter name to persist in the url/storage
   *
   * Having state in shape of:
   * type State = { someVeryLongAndReasonableName: string };
   *
   * Passing toStorageMapper as:
   * toStorageMapper: (state) => ({s: state.someVeryLongAndReasonableName})
   *
   * Will result in having a bit shorter and nicer url (someVeryLongAndReasonableName -> s)
   *
   * In this case it is also mandatory to have fromStorageMapper which should mirror toStorageMapper:
   * fromStorageMapper: (storageState) => ({someVeryLongAndReasonableName: state.s})
   *
   * 3. Use different sync strategies for different state slices
   *
   * We could have multiple SyncStorageConfigs for a State container,
   * These mappers allow to pick slices of state we want to use in this particular configuration.
   * So we can setup a slice of state to be stored in the URL as expanded state
   * and then different slice of the same state as HashedURL (just by using different strategies).
   *
   * 4. Backward compatibility
   *
   * Assume in v1 state was:
   * type State = {a: string}; // v1
   * in v2 'a' was renamed into 'b'
   * type State = {b: string}; // v2
   *
   * To make sure old urls are still working we could have fromStorageMapper:
   * fromStorageMapper: (storageState) => ({b: storageState.b || storageState.a})
   */
  toStorageMapper?: (state: State) => StorageState;
  fromStorageMapper?: (storageState: StorageState) => Partial<State>;

  /**
   * On app start during StateSync util setup,
   * Storage state and Applications's default state could be out of sync.
   *
   * initialTruthSource indicates who's values consider as source of truth
   *
   * InitialTruthSource.State - Application state take priority over storage state
   * InitialTruthSource.Storage (default) - Storage state take priority over Application state
   * InitialTruthSource.None - skip initial syncing do nothing
   */
  initialTruthSource?: InitialTruthSource;
}

/**
 * To use StateSync util application have to pass state in the shape of following interface
 * The idea is that ./store/create_store.ts should be used as state container,
 * but it is also possible to implement own container for advanced use cases
 */
export type BaseState = Record<string, unknown>;
export interface IStore<State extends BaseState = BaseState> {
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
}

/**
 * On app start during initial setup,
 * Storage state and applications's default state could be out of sync.
 *
 * initialTruthSource indicates who's values consider as source of truth
 *
 * InitialTruthSource.State - Application state take priority over storage state
 * InitialTruthSource.Storage (default) - Storage state take priority over Application state
 * InitialTruthSource.None - skip initial syncing do nothing
 */
export enum InitialTruthSource {
  Store,
  Storage,
  None,
}

/**
 * Sync strategy is responsible for where to put to / where to get from the stored state
 * 2 strategies available now, which replicate what State (AppState, GlobalState) implemented:
 *
 * SyncStrategy.Url: the same as old persisting of expanded state in rison format to url
 * SyncStrategy.HashedUrl: the same as old persisting of hashed state using sessionStorage for storing expanded state
 *
 * Possible to provide own custom SyncStrategy by implementing ISyncStrategy
 *
 * SyncStrategy.Url is default
 */
export enum SyncStrategy {
  Url,
  HashedUrl,
}

/**
 * Any SyncStrategy have to implement ISyncStrategy interface
 * SyncStrategy is responsible for:
 * state serialisation / deserialization
 * persisting to and retrieving from storage
 *
 * For an example take a look at already implemented URL sync strategies
 */
interface ISyncStrategy<StorageState extends BaseState = BaseState> {
  /**
   * Take in a state object, should serialise and persist
   */
  // TODO: replace sounds like something url specific ...
  toStorage: (state: StorageState, opts: { replace: boolean }) => void;
  /**
   * Should retrieve state from the storage and deserialize it
   */
  fromStorage: () => StorageState;
  /**
   * Should notify when the storage has changed
   */
  storageChange$: Observable<StorageState>;
}

export type SyncStrategyFactory = (syncKey: string) => ISyncStrategy;
export function isSyncStrategyFactory(
  syncStrategy: SyncStrategy | SyncStrategyFactory | void
): syncStrategy is SyncStrategyFactory {
  return typeof syncStrategy === 'function';
}

/**
 * Implements syncing to/from url strategies.
 * Replicates what was implemented in state (AppState, GlobalState)
 * Both expanded and hashed use cases
 */
const createUrlSyncStrategyFactory = (
  { useHash = false }: { useHash: boolean } = { useHash: false }
): SyncStrategyFactory => (syncKey: string): ISyncStrategy => {
  const { update: updateUrl, listen: listenUrl } = createUrlControls();
  return {
    toStorage: (state: BaseState, { replace = false } = { replace: false }) => {
      const newUrl = setStateToUrl(syncKey, state, { useHash });
      updateUrl(newUrl, replace);
    },
    fromStorage: () => getStateFromUrl(syncKey),
    storageChange$: new Observable(observer => {
      const unlisten = listenUrl(() => {
        observer.next();
      });

      return () => {
        unlisten();
      };
    }).pipe(
      map(() => getStateFromUrl(syncKey)),
      distinctUntilChangedWithInitialValue(getStateFromUrl(syncKey), shallowEqual),
      share()
    ),
  };
};

/**
 * SyncStrategy.Url: the same as old persisting of expanded state in rison format to url
 * SyncStrategy.HashedUrl: the same as old persisting of hashed state using sessionStorage for storing expanded state
 *
 * Possible to provide own custom SyncStrategy by implementing ISyncStrategy
 *
 * SyncStrategy.Url is default
 */
const Strategies: { [key in SyncStrategy]: (syncKey: string) => ISyncStrategy } = {
  [SyncStrategy.Url]: createUrlSyncStrategyFactory({ useHash: false }),
  [SyncStrategy.HashedUrl]: createUrlSyncStrategyFactory({ useHash: true }),
  // Other SyncStrategies: LocalStorage, es, somewhere else...
};

/**
 * Utility for syncing application state wrapped in IState container shape
 * with some kind of storage (e.g. URL)
 *
 * Minimal usage example:
 *
 * ```
 * type State = {tab: string};
 * const store: IStore<State> = createStore({tab: 'indexedFields'})
 *
 * syncState({
 *   syncKey: '_s',
 *   store: store
 * })
 * ```
 * Now State will be synced with url:
 * * url will be updated on any store change
 * * store will be updated on any url change
 *
 * By default SyncStrategy.Url is used, which serialises state in rison format
 *
 * The same example with different syncStrategy depending on kibana config:
 *
 * ```
 * syncState({
 *   syncKey: '_s',
 *   store: store,
 *   syncStrategy: config.get('state:storeInSessionStorage') ? SyncStrategy.HashedUrl : SyncStrategy.Url
 * })
 * ```
 *
 * If there are multiple state containers:
 * ```
 * type State1 = {tab: string};
 * const store1: IStore<State> = createStore({tab: 'indexedFields'})
 *
 * type State2 = {filter: string};
 * const store2: IStore<State> = createStore({filter: 'filter1'})
 *
 * syncState([
 *  {
 *    syncKey: '_g',
 *    store: store1
 *  },
 *  {
 *    syncKey: '_a',
 *    store: store2
 *  }
 * ])
 * ```
 *
 * If we want to sync only a slice of state
 *
 *  ```
 * type State = {tab: string, filter: string};
 * const store: IStore<State> = createStore({tab: 'indexedFields', filter: 'filter1'})
 *
 * syncState({
 *   syncKey: '_s',
 *   store: store,
 *   toStorageMapper: (state) => ({tab: state.tab})
 * })
 * ```
 *
 * Only tab slice will be synced to storage. Updates to filter slice will be ignored
 *
 * Similar way we could use different sync strategies for different slices.
 * E.g: to put into url an expanded 'tab' slice, but hashed 'filter' slice
 * ```
 * syncState([{
 *   syncKey: '_t',
 *   store: store,
 *   toStorageMapper: (state) => ({tab: state.tab}),
 *   syncStrategy: SyncStrategy.Url
 *   },
 *   {
 *   syncKey: '_f',
 *   store: store,
 *   toStorageMapper: (state) => ({filter: state.filter}),
 *   syncStrategy: SyncStrategy.HashedUrl
 *  }
 * }])
 * ```
 *
 * syncState returns destroy function
 * ```
 * const destroy = syncState();
 * destroy(); // stops listening for state and storage updates
 * ```
 */
export type DestroySyncStateFnType = () => void;
export function syncState(config: IStateSyncConfig[] | IStateSyncConfig): DestroySyncStateFnType {
  const stateSyncConfigs = Array.isArray(config) ? config : [config];
  const subscriptions: Subscription[] = [];

  // flags are needed to be able to skip our own state / storage updates
  // e.g. when we trigger state because storage changed,
  // we want to make sure we won't run into infinite cycle
  let ignoreStateUpdate = false;
  let ignoreStorageUpdate = false;

  stateSyncConfigs.forEach(stateSyncConfig => {
    const toStorageMapper = stateSyncConfig.toStorageMapper || (s => s);
    const fromStorageMapper = stateSyncConfig.fromStorageMapper || (s => s);

    const { toStorage, fromStorage, storageChange$ } = (isSyncStrategyFactory(
      stateSyncConfig.syncStrategy
    )
      ? stateSyncConfig.syncStrategy
      : Strategies[stateSyncConfig.syncStrategy || SyncStrategy.Url])(stateSyncConfig.syncKey);

    // returned boolean indicates if update happen
    const updateState = (): boolean => {
      if (ignoreStateUpdate) return false;
      const update = (): boolean => {
        const storageState = fromStorage();
        if (!storageState) {
          ignoreStorageUpdate = false;
          return false;
        }

        if (storageState) {
          stateSyncConfig.store.set({
            ...stateSyncConfig.store.get(),
            ...fromStorageMapper(storageState),
          });
          return true;
        }

        return false;
      };

      ignoreStorageUpdate = true;
      const updated = update();
      ignoreStorageUpdate = false;
      return updated;
    };

    // returned boolean indicates if update happen
    const updateStorage = ({ replace = false } = {}): boolean => {
      if (ignoreStorageUpdate) return false;

      const update = () => {
        const newStorageState = toStorageMapper(stateSyncConfig.store.get());
        toStorage(newStorageState, { replace });
        return true;
      };

      ignoreStateUpdate = true;
      const hasUpdated = update();
      ignoreStateUpdate = false;
      return hasUpdated;
    };

    // initial syncing of store state and storage state
    const initialTruthSource = stateSyncConfig.initialTruthSource ?? InitialTruthSource.Storage;
    if (initialTruthSource === InitialTruthSource.Storage) {
      const hasUpdated = updateState();
      // if there is nothing by state key in storage
      // then we should fallback and consider state source of truth
      if (!hasUpdated) {
        updateStorage({ replace: true });
      }
    } else if (initialTruthSource === InitialTruthSource.Store) {
      updateStorage({ replace: true });
    }

    subscriptions.push(
      stateSyncConfig.store.state$
        .pipe(
          map(toStorageMapper),
          distinctUntilChangedWithInitialValue(
            toStorageMapper(stateSyncConfig.store.get()),
            shallowEqual
          )
        )
        .subscribe(() => {
          // TODO: batch storage updates
          updateStorage();
        }),
      storageChange$.subscribe(() => {
        // TODO: batch state updates? or should it be handled by state containers instead?
        updateState();
      })
    );
  });

  return () => {
    subscriptions.forEach(sub => sub.unsubscribe());
  };
}

// https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/shallowEqual.js
function shallowEqual(objA: any, objB: any): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

/**
 * IE11 does not support Object.is
 */
function is(x: any, y: any): boolean {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}

function distinctUntilChangedWithInitialValue<T>(
  initialValue: T,
  compare?: (x: T, y: T) => boolean
): MonoTypeOperatorFunction<T> {
  return input$ => input$.pipe(startWith(initialValue), distinctUntilChanged(compare), skip(1));
}
