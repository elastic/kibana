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

export interface IKbnUrlStateStorage extends IStateStorage {
  set: <State>(key: string, state: State, opts?: { replace: boolean }) => Promise<string>;
  get: <State = unknown>(key: string) => State | null;
  change$: <State = unknown>(key: string) => Observable<State | null>;

  // cancels any pending url updates
  cancel: () => void;

  // synchronously runs any pending url updates
  flush: (opts?: { replace?: boolean }) => void;
}

/**
 * Implements syncing to/from url strategies.
 * Replicates what was implemented in state (AppState, GlobalState)
 * Both expanded and hashed use cases
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
        currentUrl => setStateToKbnUrl(key, state, { useHash }, currentUrl),
        replace
      );
    },
    get: key => getStateFromKbnUrl(key),
    change$: <State>(key: string) =>
      new Observable(observer => {
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
      url.flush(replace);
    },
    cancel() {
      url.cancel();
    },
  };
};
