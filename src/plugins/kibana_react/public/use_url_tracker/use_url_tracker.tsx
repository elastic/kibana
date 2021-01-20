/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { History } from 'history';
import { useLayoutEffect } from 'react';
import { createUrlTracker } from '../../../kibana_utils/public/';

/**
 * State management url_tracker in react hook form
 *
 * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
 * Persists the url in sessionStorage so it could be restored if navigated back to the app
 *
 * @param key - key to use in storage
 * @param history - history instance to use
 * @param shouldRestoreUrl - cb if url should be restored
 * @param storage - storage to use. window.sessionStorage is default
 */
export function useUrlTracker(
  key: string,
  history: History,
  shouldRestoreUrl: (urlToRestore: string) => boolean = () => true,
  storage: Storage = sessionStorage
) {
  useLayoutEffect(() => {
    const urlTracker = createUrlTracker(key, storage);
    const urlToRestore = urlTracker.getTrackedUrl();
    if (urlToRestore && shouldRestoreUrl(urlToRestore)) {
      history.replace(urlToRestore);
    }
    const stopTrackingUrl = urlTracker.startTrackingUrl(history);
    return () => {
      stopTrackingUrl();
    };
  }, [key, history]);
}
