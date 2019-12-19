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

import { createBrowserHistory, Location, History, createLocation } from 'history';
import { useLayoutEffect } from 'react';

/**
 * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
 * Persists the url in sessionStorage so it could be restored if navigated back to the app
 */
export function createUrlTracker(key: string, history: History = createBrowserHistory()) {
  return {
    restoreUrl() {
      const preservedLocation = JSON.parse(sessionStorage.getItem(key)!) as Location<any>;
      if (preservedLocation) {
        history.replace(preservedLocation);
      }
    },
    startTrackingUrl() {
      return history.listen(location => {
        sessionStorage.setItem(key, JSON.stringify(location));
      });
    },
    trackUrl(url: string | Location<any>) {
      if (typeof url === 'string') {
        url = createLocation(url);
      }
      sessionStorage.setItem(key, JSON.stringify(location));
    },
  };
}

export function useUrlTracker(appInstanceId: string, history: History) {
  useLayoutEffect(() => {
    const urlTracker = createUrlTracker(`lastUrlTracker:${appInstanceId}`, history);
    urlTracker.restoreUrl();
    const stopTrackingUrl = urlTracker.startTrackingUrl();
    return () => {
      stopTrackingUrl();
    };
  }, [appInstanceId, history]);
}
