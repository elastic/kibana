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
import { concatMap, map, share } from 'rxjs/operators';
import { from } from 'rxjs';
import { ISyncStrategy } from './types';
import { getStateFromKbnUrl } from '../../state_management/url';

/**
 * This strategy implements state restoration similar to what GlobalState in legacy world did
 * It syncs state both to url and to session storage
 *
 * Syncing to session storage is needed to restore state piece which should be preserved between apps
 *
 * @param urlSyncStrategy
 * @param sessionStorageSyncStrategy
 * @param initialUrl (optional) - initial application url to restore state from.
 * Will take the highest priority duration state restoration if present.
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
      if (isRestoringInitialState) {
        const [currentStateFromUrl, stateFromSessionStorage] = await Promise.all([
          urlSyncStrategy.fromStorage<State>(syncKey),
          sessionStorageSyncStrategy.fromStorage<State>(syncKey),
        ]);

        if (initialUrl) {
          const initialStateFromUrl = getStateFromKbnUrl<State>(syncKey, initialUrl);
          if (initialStateFromUrl) {
            if (!isEqual(initialStateFromUrl, currentStateFromUrl)) {
              await Promise.all([
                urlSyncStrategy.toStorage(syncKey, initialStateFromUrl, { replace: true }),
                sessionStorageSyncStrategy.toStorage(syncKey, initialStateFromUrl),
              ]);
            }
            return initialStateFromUrl;
          }
        }

        if (stateFromSessionStorage) {
          await Promise.all([
            urlSyncStrategy.toStorage(syncKey, stateFromSessionStorage, { replace: true }),
            sessionStorageSyncStrategy.toStorage(syncKey, stateFromSessionStorage),
          ]);
          return stateFromSessionStorage;
        }

        return currentStateFromUrl;
      }

      return urlSyncStrategy.fromStorage<State>(syncKey);
    },
    storageChange$: <State>(syncKey: string) =>
      urlSyncStrategy.storageChange$!<State>(syncKey).pipe(
        concatMap(newState => {
          return from(sessionStorageSyncStrategy.toStorage<State>(syncKey, newState!)).pipe(
            map(() => newState)
          );
        }),
        share()
      ),
  };
};
