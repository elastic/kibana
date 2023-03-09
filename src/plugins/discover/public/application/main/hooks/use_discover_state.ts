/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useCallback } from 'react';
import { FetchStatus } from '../../types';
import { changeDataView } from './utils/change_data_view';
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
  const savedSearch = stateContainer.savedSearchState.getInitial$().getValue();

  const { setUrlTracking } = useUrlTracking(savedSearch);

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
    savedSearch,
  });

  /**
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = useCallback(
    async (id: string) => {
      await changeDataView(id, { services, discoverState: stateContainer, setUrlTracking });
      if (stateContainer.internalState.getState().expandedDoc) {
        stateContainer.internalState.transitions.setExpandedDoc(undefined);
      }
    },
    [services, setUrlTracking, stateContainer]
  );

  useEffect(() => {
    const unsubscribe = stateContainer.actions.initializeAndSync();
    return () => unsubscribe();
  }, [stateContainer]);

  /**
   * Trigger data fetching on dataView or savedSearch changes
   */
  useEffect(() => {
    if (stateContainer.dataState.getInitialFetchStatus() === FetchStatus.LOADING) {
      stateContainer.dataState.fetch();
    }
  }, [savedSearch.id, stateContainer.dataState]);

  return {
    onChangeDataView,
    persistDataView,
  };
}
