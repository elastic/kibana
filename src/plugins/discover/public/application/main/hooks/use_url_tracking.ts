/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect } from 'react';
import { DiscoverSavedSearchContainer } from '../services/discover_saved_search_container';
import { getUrlTracker } from '../../../kibana_services';

/**
 * Enable/disable kbn url tracking (That's the URL used when selecting Discover in the side menu)
 */
export function useUrlTracking(savedSearchContainer: DiscoverSavedSearchContainer) {
  useEffect(() => {
    const subscription = savedSearchContainer.getCurrent$().subscribe((savedSearch) => {
      const dataView = savedSearch.searchSource.getField('index');
      if (!dataView) {
        return;
      }
      const trackingEnabled = Boolean(dataView.isPersisted() || savedSearch.id);
      getUrlTracker().setTrackingEnabled(trackingEnabled);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [savedSearchContainer]);
}
