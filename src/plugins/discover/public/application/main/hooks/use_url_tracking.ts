/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { getUrlTracker } from '../../../kibana_services';

/**
 * Enable/disable kbn url tracking (That's the URL used when selecting Discover in the side menu)
 */
export function useUrlTracking(savedSearch: SavedSearch, dataView: DataView) {
  const setUrlTracking = useCallback(
    (actualDataView: DataView) => {
      const trackingEnabled = Boolean(actualDataView.isPersisted() || savedSearch.id);
      getUrlTracker().setTrackingEnabled(trackingEnabled);
    },
    [savedSearch]
  );

  useEffect(() => {
    setUrlTracking(dataView);
  }, [dataView, savedSearch.id, setUrlTracking]);

  return { setUrlTracking };
}
