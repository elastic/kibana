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
import { IStateStorage } from './types';
import {
  createKbnUrlControls,
  getStateFromKbnUrl,
  setStateToKbnUrl,
} from '../../state_management/url';

/**
 * KbnUrlStateStorage is a state storage for {@link syncState} utility which:
 *
 * 1. Keeps state in sync with the URL.
 * 2. Serializes data and stores it in the URL in one of the supported formats:
 *   * Rison encoded.
 *   * Hashed URL: In URL we store only the hash from the serialized state, but the state itself is stored in sessionStorage. See Kibana's `state:storeInSessionStorage` advanced option for more context.
 * 3. Takes care of listening to the URL updates and notifies state about the updates.
 * 4. Takes care of batching URL updates to prevent redundant browser history records.
 *
 * {@link https://github.com/elastic/kibana/blob/master/src/plugins/kibana_utils/docs/state_sync/storages/kbn_url_storage.md | Refer to this guide for more info}
 * @public
 */
export interface IKbnUrlStateStorage extends IStateStorage {
  set: <State>(
    key: string,
    state: State,
    opts?: { replace: boolean }
  ) => Promise<string | undefined>;
  get: <State = unknown>(key: string) => State | null;
  change$: <State = unknown>(key: string) => Observable<State | null>;

  /**
   * cancels any pending url updates
   */
  cancel: () => void;

  /**
   * Synchronously runs any pending url updates, returned boolean indicates if change occurred.
   * @param opts: {replace? boolean} - allows to specify if push or replace should be used for flushing update
   * @returns boolean - indicates if there was an update to flush
   */
  flush: (opts?: { replace?: boolean }) => boolean;
}

/**
 * Creates {@link IKbnUrlStateStorage} state storage
 * @returns - {@link IKbnUrlStateStorage}
 * @public
 */
export const createKbnUrlStateStorage = (
  { useHash = false, history }: { useHash: boolean; history?: History } = { useHash: false }
): IKbnUrlStateStorage => {
  const url = createKbnUrlControls(history);
  return {
    set: <State>(
      key: string,
      state: State,
      { replace = false }: { replace: boolean } = { replace: false }
    ) => {
      // syncState() utils doesn't wait for this promise
      return url.updateAsync(
        (currentUrl) => setStateToKbnUrl(key, state, { useHash }, currentUrl),
        replace
      );
    },
    get: (key) => {
      // if there is a pending url update, then state will be extracted from that pending url,
      // otherwise current url will be used to retrieve state from
      return getStateFromKbnUrl(key, url.getPendingUrl());
    },
    change$: <State>(key: string) =>
      new Observable((observer) => {
        const unlisten = url.listen(() => {
          observer.next();
        });

        return () => {
          unlisten();
        };
      }).pipe(
        map(() => getStateFromKbnUrl<State>(key)),
        share()
      ),
    flush: ({ replace = false }: { replace?: boolean } = {}) => {
      return !!url.flush(replace);
    },
    cancel() {
      url.cancel();
    },
  };
};
