/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBrowserHistory, History, Location } from 'history';
import { getRelativeToHistoryPath } from './kbn_url_storage';

export interface IUrlTracker {
  startTrackingUrl: (history?: History) => () => void;
  getTrackedUrl: () => string | null;
  trackUrl: (url: string) => void;
}
/**
 * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
 * Persists the url in sessionStorage so it could be restored if navigated back to the app
 */
export function createUrlTracker(key: string, storage: Storage = sessionStorage): IUrlTracker {
  return {
    startTrackingUrl(history: History = createBrowserHistory()) {
      const track = (location: Location<any>) => {
        const url = getRelativeToHistoryPath(history.createHref(location), history);
        storage.setItem(key, url);
      };
      track(history.location);
      return history.listen(track);
    },
    getTrackedUrl() {
      return storage.getItem(key);
    },
    trackUrl(url: string) {
      storage.setItem(key, url);
    },
  };
}
