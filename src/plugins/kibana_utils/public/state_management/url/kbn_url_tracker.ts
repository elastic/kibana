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

import { createBrowserHistory, History, UnregisterCallback } from 'history';
import { getRelativeToHistoryPath, setStateToKbnUrl } from './kbn_url_storage';
import {
  BehaviorSubject,
  Observable,
} from 'rxjs';
import { AppUpdater } from 'kibana/public';

export interface KbnUrlTracker {
  appMounted: () => void;
  appUnMounted: () => void;
  stop: () => void;
}

/**
 * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
 * Persists the url in sessionStorage so it could be restored if navigated back to the app
 */
export function createKbnUrlTracker(
  baseUrl: string,
  useHash: boolean,
  // storage key,
  storageKey: string,
  // _g
  urlKey: string,
  stateUpdate$: Observable<unknown>,
  navLinkUpdater$: BehaviorSubject<AppUpdater>
): KbnUrlTracker {
  const storage: Storage = sessionStorage;
  const storedUrl = storage.getItem(storageKey);
  let currentUrl: string = '';
  const history: History = createBrowserHistory();
  let stopHistory: UnregisterCallback | undefined;
  function listenToHistory() {
    unlistenHistory();
    stopHistory = history.listen(location => {
      const url = getRelativeToHistoryPath(history.createHref(location), history);
      currentUrl = url;
      storage.setItem(storageKey, currentUrl);
    });
  }
  function unlistenHistory() {
    if (stopHistory) {
      stopHistory();
    }
  }
  const sub = stateUpdate$.subscribe(state => {
    currentUrl = setStateToKbnUrl(urlKey, state, { useHash }, currentUrl);
    storage.setItem(storageKey, currentUrl);
  });
  if (storedUrl) {
    navLinkUpdater$.next(() => ({ url: storedUrl }));
  }
  return {
    appMounted() {
      listenToHistory();
      navLinkUpdater$.next(() => ({ url: currentUrl }));
    },
    appUnMounted() {
      unlistenHistory();
      navLinkUpdater$.next(() => ({ url: baseUrl }));
    },
    stop() {
      unlistenHistory();
      sub.unsubscribe();
    },
  };
}
