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

export interface IStateSyncConfig<
  State extends BaseState = BaseState,
  StorageState extends BaseState = BaseState
> {
  syncKey: string;
  state: IState<State>;
  syncStrategy?: SyncStrategy;
  toStorageMapper?: (state: State) => StorageState;
  fromStorageMapper?: (storageState: StorageState) => Partial<State>;
  initialTruthSource?: InitialTruthSource;
}

export type BaseState = Record<string, unknown>;

/**
 * To use StateSync util application have to pass state in the form of following interface
 */
export interface IState<State extends BaseState = BaseState> {
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
}

export enum InitialTruthSource {
  State,
  Storage,
  None,
}

export enum SyncStrategy {
  Url,
  HashedUrl,
}

interface ISyncStrategy<StorageState extends BaseState = BaseState> {
  // TODO: replace sounds like something url specific ...
  toStorage: (state: StorageState, opts: { replace: boolean }) => void;
  fromStorage: () => StorageState;
  storageChange$: Observable<StorageState>;
}

function distinctUntilChangedWithInitialValue<T>(
  initialValue: T,
  compare?: (x: T, y: T) => boolean
): MonoTypeOperatorFunction<T> {
  return input$ => input$.pipe(startWith(initialValue), distinctUntilChanged(compare), skip(1));
}

const createUrlSyncStrategyFactory = (
  { useHash = false }: { useHash: boolean } = { useHash: false }
) => (key: string): ISyncStrategy => {
  const { update: updateUrl, listen: listenUrl } = createUrlControls();
  return {
    toStorage: (state: BaseState, { replace = false } = { replace: false }) => {
      updateUrl(setStateToUrl(key, state, { useHash }), replace);
    },
    fromStorage: () => getStateFromUrl(key),
    storageChange$: new Observable(observer => {
      const unlisten = listenUrl(() => {
        observer.next();
      });

      return () => {
        unlisten();
      };
    }).pipe(
      map(() => getStateFromUrl(key)),
      distinctUntilChangedWithInitialValue(getStateFromUrl(key), shallowEqual),
      share()
    ),
  };
};

const Strategies: { [key in SyncStrategy]: (stateKey: string) => ISyncStrategy } = {
  [SyncStrategy.Url]: createUrlSyncStrategyFactory({ useHash: false }),
  [SyncStrategy.HashedUrl]: createUrlSyncStrategyFactory({ useHash: true }),
  // Other SyncStrategies: LocalStorage, es, somewhere else...
};

export function syncState(config: IStateSyncConfig[] | IStateSyncConfig) {
  const stateSyncConfigs = Array.isArray(config) ? config : [config];
  const subscriptions: Subscription[] = [];
  let ignoreStateUpdate = false;
  let ignoreStorageUpdate = false;

  stateSyncConfigs.forEach(stateSyncConfig => {
    const toStorageMapper = stateSyncConfig.toStorageMapper || (s => s);
    const fromStorageMapper = stateSyncConfig.fromStorageMapper || (s => s);

    const { toStorage, fromStorage, storageChange$ } = Strategies[
      stateSyncConfig.syncStrategy || SyncStrategy.Url
    ](stateSyncConfig.syncKey);

    const updateState = (): boolean => {
      if (ignoreStateUpdate) return false;
      const update = () => {
        const storageState = fromStorage();
        if (!storageState) {
          ignoreStorageUpdate = false;
          return false;
        }

        if (storageState) {
          stateSyncConfig.state.set({
            ...stateSyncConfig.state.get(),
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

    const updateStorage = ({ replace = false } = {}): boolean => {
      if (ignoreStorageUpdate) return false;

      const update = () => {
        const newStorageState = toStorageMapper(stateSyncConfig.state.get());
        toStorage(newStorageState, { replace });
        return true;
      };

      ignoreStateUpdate = true;
      const hasUpdated = update();
      ignoreStateUpdate = false;
      return hasUpdated;
    };

    const initialTruthSource = stateSyncConfig.initialTruthSource ?? InitialTruthSource.Storage;
    if (initialTruthSource === InitialTruthSource.Storage) {
      const hasUpdated = updateState();
      // if there is nothing by state key in storage
      // then we should fallback and consider state source of truth
      if (!hasUpdated) {
        updateStorage({ replace: true });
      }
    } else if (initialTruthSource === InitialTruthSource.State) {
      updateStorage({ replace: true });
    }

    subscriptions.push(
      stateSyncConfig.state.state$
        .pipe(
          map(toStorageMapper),
          distinctUntilChangedWithInitialValue(
            toStorageMapper(stateSyncConfig.state.get()),
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
