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

import isEqual from 'react-fast-compare';
import { share, tap } from 'rxjs/operators';
import { ISyncStrategy } from './types';
import { getStateFromKbnUrl } from '../../state_management/url';

/**
 * KbnGlobalStateSyncStrategy strategy implements state restoration similar to what GlobalState in legacy world did
 * It syncs state both to url and to session storage
 *
 * Syncing to session storage is needed to restore state during navigation between apps,
 * as in NP the agreement is that apps will handle state restoration by themselves without help of core.
 * Global state from session storage should be restored when user navigates to base root of the app
 *
 * @param urlSyncStrategy - sync strategy to use for syncing state to url
 * @param sessionStorageSyncStrategy - sync strategy to use for syncing state to session storage
 * @param initialUrl (optional) - initial application url to restore state from.
 *
 * initialUrl will take the highest priority duration state restoration if present.
 * Is needed for cases when user manually pastes kibana url and we don't want it to be overridden by session storage data
 */
export const createKbnGlobalStateSyncStrategy = (
  urlSyncStrategy: ISyncStrategy,
  sessionStorageSyncStrategy: ISyncStrategy,
  initialUrl?: string
): ISyncStrategy => {
  return {
    toStorage: <State>(
      syncKey: string,
      state: State,
      opts: { replace: boolean } = { replace: false }
    ) =>
      Promise.all([
        urlSyncStrategy.toStorage(syncKey, state, opts),
        sessionStorageSyncStrategy.toStorage(syncKey, state),
      ]).then(() => void 0),
    fromStorage: async <State>(
      syncKey: string,
      { isRestoringInitialState = false }: { isRestoringInitialState: boolean } = {
        isRestoringInitialState: false,
      }
    ) => {
      if (!isRestoringInitialState) {
        return urlSyncStrategy.fromStorage<State>(syncKey);
      }

      // restoring initial state
      // when restoring initial state also need to make sure that all sources of KbnGlobalStateSyncStrategy are in sync

      const [currentStateFromUrl, stateFromSessionStorage] = await Promise.all([
        urlSyncStrategy.fromStorage<State>(syncKey),
        sessionStorageSyncStrategy.fromStorage<State>(syncKey),
      ]);

      if (initialUrl) {
        const initialStateFromUrl = getStateFromKbnUrl<State>(syncKey, initialUrl);
        if (initialStateFromUrl) {
          // make sure other sources are in sync
          await Promise.all([
            urlSyncStrategy.toStorage(syncKey, initialStateFromUrl, { replace: true }),
            sessionStorageSyncStrategy.toStorage(syncKey, initialStateFromUrl),
          ]);
          return initialStateFromUrl;
        }
      }

      if (stateFromSessionStorage) {
        // make sure that url is in state that are going to restore
        await urlSyncStrategy.toStorage(syncKey, stateFromSessionStorage, { replace: true });
        return stateFromSessionStorage;
      }

      // make sure that session storage in a state that are going to restore
      await sessionStorageSyncStrategy.toStorage(syncKey, stateFromSessionStorage);
      return currentStateFromUrl;
    },
    storageChange$: <State>(syncKey: string) =>
      urlSyncStrategy.storageChange$!<State>(syncKey).pipe(
        tap(newState => {
          // have to manually sync this change to session storage
          sessionStorageSyncStrategy.toStorage<State>(syncKey, newState!);
        }),
        share()
      ),
  };
};
