/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect } from 'react';
import { useSearchSession } from './use_search_session';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { useUrlTracking } from './use_url_tracking';
import { DiscoverStateContainer } from '../services/discover_state';
import { DiscoverServices } from '../../../build_services';
import { useAdHocDataViews } from './use_adhoc_data_views';

export function useDiscoverState({
  services,
  stateContainer,
}: {
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
}) {
  const { dataViews, trackUiMetric } = services;

  useUrlTracking(stateContainer.savedSearchState);

  /**
   * Search session logic
   */
  useSearchSession({ services, stateContainer });

  /**
   * Adhoc data views functionality
   */
  const { persistDataView } = useAdHocDataViews({
    stateContainer,
    trackUiMetric,
  });

  /**
   * State changes (data view, columns), when a text base query result is returned
   */
  useTextBasedQueryLanguage({
    dataViews,
    stateContainer,
  });
  /**
   * Start state syncing and fetch data if necessary
   */
  useEffect(() => {
    const unsubscribe = stateContainer.actions.initializeAndSync();
    stateContainer.actions.fetchData(true);
    return () => unsubscribe();
  }, [stateContainer]);

  return {
    persistDataView,
  };
}
