/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../state_management/discover_state';

/**
 * Enable/disable kbn url tracking (That's the URL used when selecting Discover in the side menu)
 */
export function useUrlTracking(stateContainer: DiscoverStateContainer) {
  const { savedSearchState, internalState } = stateContainer;
  const { urlTracker } = useDiscoverServices();

  useEffect(() => {
    const subscription = savedSearchState.getCurrent$().subscribe((savedSearch) => {
      const dataView = savedSearch.searchSource.getField('index');

      if (!dataView?.id) {
        return;
      }

      const dataViewSupportsTracking =
        // Disable for ad hoc data views, since they can't be restored after a page refresh
        dataView.isPersisted() ||
        // Unless it's a default profile data view, which can be restored on refresh
        internalState.get().defaultProfileAdHocDataViewIds.includes(dataView.id) ||
        // Or we're in ES|QL mode, in which case we don't care about the data view
        isOfAggregateQueryType(savedSearch.searchSource.getField('query'));

      const trackingEnabled = dataViewSupportsTracking || Boolean(savedSearch.id);

      urlTracker.setTrackingEnabled(trackingEnabled);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [internalState, savedSearchState, urlTracker]);
}
