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

import { parse } from 'url';
import { createHashHistory, History } from 'history';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppUpdater } from 'kibana/public';
import { setStateToKbnUrl } from './kbn_url_storage';

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
  defaultHash: string,
  useHash: boolean,
  // storage key,
  storageKey: string,
  // _g
  urlKey: string,
  stateUpdate$: Observable<unknown>,
  navLinkUpdater$: BehaviorSubject<AppUpdater>
): KbnUrlTracker {
  let currentUrl: string = '';
  let appIsMounted = false;
  const history: History = createHashHistory();

  function setNavLink(hash: string) {
    navLinkUpdater$.next(() => ({ activeUrl: baseUrl + hash }));
  }

  // track current hash when within app
  const stopHistory = history.listen(location => {
    if (!appIsMounted) {
      return;
    }
    currentUrl = '#' + location.pathname + location.search;
    storage.setItem(storageKey, currentUrl);
  });

  // propagate state updates when in other apps
  const sub = stateUpdate$.subscribe(state => {
    if (appIsMounted) {
      return;
    }
    const updatedAbsoluteUrl = setStateToKbnUrl(
      urlKey,
      state,
      { useHash },
      baseUrl + (currentUrl || defaultHash)
    );
    currentUrl = parse(updatedAbsoluteUrl).hash!;
    storage.setItem(storageKey, currentUrl);
    setNavLink(currentUrl);
  });

  // initialize right
  const storage: Storage = sessionStorage;
  const storedUrl = storage.getItem(storageKey);
  if (storedUrl) {
    currentUrl = storedUrl;
    setNavLink(storedUrl);
  }
  return {
    appMounted() {
      appIsMounted = true;
      setNavLink(defaultHash);
    },
    appUnMounted() {
      appIsMounted = false;
      setNavLink(currentUrl);
    },
    stop() {
      stopHistory();
      sub.unsubscribe();
    },
  };
}
