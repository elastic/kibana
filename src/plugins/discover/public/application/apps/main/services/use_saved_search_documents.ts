/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useState, useCallback } from 'react';
import { validateTimeRange } from '../utils/validate_time_range';
import { fetchStatuses } from '../../../components/constants';
import { IndexPattern, ISearchSource } from '../../../../kibana_services';
import { updateSearchSource } from '../utils/update_search_source';
import { DiscoverServices } from '../../../../build_services';
import { GetStateReturn } from './discover_state';
import { SortOrder } from '../../../../saved_searches/types';
import { IInspectorInfo } from '../../../../../../data/common';

export function useSavedSearchDocuments({
  indexPattern,
  services,
  stateContainer,
  useNewFieldsApi,
  volatileSearchSource,
  shouldSearchOnPageLoad,
}: {
  services: DiscoverServices;
  indexPattern: IndexPattern;
  useNewFieldsApi: boolean;
  volatileSearchSource: ISearchSource;
  stateContainer: GetStateReturn;
  shouldSearchOnPageLoad: () => boolean;
}) {
  const [fetchStatus, setFetchStatus] = useState(
    shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED
  );
  const [fetchCounter, setFetchCounter] = useState(0);
  const [fetchError, setFetchError] = useState(undefined);

  const fetch = useCallback(
    (abortController: AbortController, searchSessionId: string, inspector: IInspectorInfo) => {
      setFetchCounter(fetchCounter + 1);
      setFetchError(undefined);

      if (!validateTimeRange(services.timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }

      const { sort } = stateContainer.appStateContainer.getState();
      updateSearchSource({
        volatileSearchSource,
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
        showUnmappedFields: useNewFieldsApi,
      });
      setFetchStatus(fetchStatuses.LOADING);

      return volatileSearchSource
        .fetch$({
          abortSignal: abortController.signal,
          sessionId: searchSessionId,
          inspector,
        })
        .toPromise()
        .then(({ rawResponse }) => {
          setFetchStatus(fetchStatuses.COMPLETE);
          return rawResponse.hits.hits;
        })
        .catch((error) => {
          // If the request was aborted then no need to surface this error in the UI
          if (error instanceof Error && error.name === 'AbortError') return;
          setFetchStatus(fetchStatuses.ERROR);
          setFetchError(error);
          services.data.search.showError(error);
        });
    },
    [
      fetchCounter,
      indexPattern,
      services,
      stateContainer.appStateContainer,
      useNewFieldsApi,
      volatileSearchSource,
    ]
  );
  return {
    fetchStatus,
    fetchError,
    fetchCounter,
    fetch,
  };
}
