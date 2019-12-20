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

import { createBrowserHistory, History } from 'history';
import { useLayoutEffect } from 'react';
import { getRelativeToHistoryPath } from './url_storage';

/**
 * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
 * Persists the url in sessionStorage so it could be restored if navigated back to the app
 */
export function createUrlTracker(key: string, history: History = createBrowserHistory()) {
  return {
    startTrackingUrl() {
      return history.listen(location => {
        const url = getRelativeToHistoryPath(history.createHref(location), history);
        sessionStorage.setItem(key, url);
      });
    },
    getTrackedUrl() {
      return sessionStorage.getItem(key);
    },
    trackUrl(url: string) {
      sessionStorage.setItem(key, url);
    },
  };
}

export function useUrlTracker(
  appInstanceId: string,
  history: History,
  shouldRestoreUrl: (urlToRestore: string) => boolean = () => true
) {
  useLayoutEffect(() => {
    const urlTracker = createUrlTracker(`lastUrlTracker:${appInstanceId}`, history);
    const urlToRestore = urlTracker.getTrackedUrl();
    if (urlToRestore && shouldRestoreUrl(urlToRestore)) {
      history.replace(urlToRestore);
    }
    const stopTrackingUrl = urlTracker.startTrackingUrl();
    return () => {
      stopTrackingUrl();
    };
  }, [appInstanceId, history]);
}
