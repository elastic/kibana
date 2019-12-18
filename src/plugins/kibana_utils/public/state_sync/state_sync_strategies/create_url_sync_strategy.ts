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

import { Observable } from 'rxjs';
import { map, share } from 'rxjs/operators';
import { History } from 'history';
import { ISyncStrategy } from './types';
import { createUrlControls, getStateFromUrl, setStateToUrl } from '../../state_management/url';

/**
 * Implements syncing to/from url strategies.
 * Replicates what was implemented in state (AppState, GlobalState)
 * Both expanded and hashed use cases
 */
export const createUrlSyncStrategy = (
  { useHash = false, history }: { useHash: boolean; history?: History } = { useHash: false }
): ISyncStrategy => {
  const url = createUrlControls(history);
  return {
    toStorage: async <State>(
      syncKey: string,
      state: State,
      { replace = false }: { replace: boolean } = { replace: false }
    ) => {
      await url.updateAsync(
        currentUrl => setStateToUrl(syncKey, state, { useHash }, currentUrl),
        replace
      );
    },
    fromStorage: async syncKey => getStateFromUrl(syncKey),
    storageChange$: <State>(syncKey: string) =>
      new Observable(observer => {
        const unlisten = url.listen(() => {
          observer.next();
        });

        return () => {
          unlisten();
        };
      }).pipe(
        map(() => getStateFromUrl<State>(syncKey)),
        share()
      ),
  };
};
