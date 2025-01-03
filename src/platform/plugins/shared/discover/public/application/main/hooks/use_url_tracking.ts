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
import { useInternalStateSelector } from '../state_management/discover_internal_state_container';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

/**
 * Enable/disable kbn url tracking (That's the URL used when selecting Discover in the side menu)
 */
export function useUrlTracking() {
  const { urlTracker } = useDiscoverServices();
  const savedSearch = useInternalStateSelector((state) => state.discoverSessionEdited!);

  useEffect(() => {
    const dataView = savedSearch.searchSource.getField('index');
    if (!dataView) {
      return;
    }
    const trackingEnabled =
      // Disable for ad-hoc data views as it can't be restored after a page refresh
      Boolean(dataView.isPersisted() || savedSearch.id) ||
      // Enable for ES|QL, although it uses ad-hoc data views
      isOfAggregateQueryType(savedSearch.searchSource.getField('query'));

    urlTracker.setTrackingEnabled(trackingEnabled);
  }, [savedSearch, urlTracker]);
}
