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

import { createBrowserHistory, History, Location } from 'history';
import { getRelativeToHistoryPath, setStateToKbnUrl } from './kbn_url_storage';
import { BehaviorSubject, from, InteropObservable, Observable, ObservableLike, Subject, Subscribable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppUpdater } from 'kibana/public';
import { createRealUrlTracker, UrlTrackingEvent } from './url_tracker';
import { getQueryObservable } from '../../../../data/public/query/state_sync/sync_query';
import { QueryStart } from '../../../../data/public/query';

export interface KbnUrlTracker {
  appMounted: () => void;
  appUnMounted: () => void;
  stop: () => void;
}

export type KbnUrlTrackingEvent =
  | { type: 'STATE_UPDATED'; newState: unknown }
  | { type: 'APP_MOUNT' }
  | { type: 'APP_UNMOUNT' };

/**
 * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
 * Persists the url in sessionStorage so it could be restored if navigated back to the app
 */
export function createKbnUrlTracker(
  baseUrl: string,
  useHash: boolean,
  // _g
  urlKey: string,
  stateUpdate$: Subscribable<unknown>,
  navLinkUpdater$: BehaviorSubject<AppUpdater>
): KbnUrlTracker {
  const events$ = new Subject<UrlTrackingEvent>();
  const history: History = createBrowserHistory();
  const stopHistory = history.listen(location => {
    const url = getRelativeToHistoryPath(history.createHref(location), history);
    events$.next({ type: 'CONTEXT_CHANGED', urlUpdater: () => url });
  });
  stateUpdate$.pipe(
    map<unknown, UrlTrackingEvent>(state => {
      return {
        type: 'CONTEXT_CHANGED',
        urlUpdater: (oldUrl: string) => {
          return setStateToKbnUrl(urlKey, state, { useHash }, oldUrl);
        },
      };
    })
  );
  const stop = createRealUrlTracker(baseUrl, events$.asObservable(), navLinkUpdater$);
  return {
    appMounted() {
      events$.next({ type: 'APP_MOUNT' });
    },
    appUnMounted() {
      events$.next({ type: 'APP_UNMOUNT' });
    },
    stop() {
      stop();
      stopHistory();
    },
  };
}

// thats in the app
createKbnUrlTracker(
  '',
  true,
  '_g',
  getQueryObservable({} as QueryStart).state$,
  undefined
);
