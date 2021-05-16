/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback } from 'react';
import { validateTimeRange } from '../utils/validate_time_range';
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
  searchSource,
}: {
  services: DiscoverServices;
  indexPattern: IndexPattern;
  useNewFieldsApi: boolean;
  searchSource: ISearchSource;
  stateContainer: GetStateReturn;
}) {
  const fetch = useCallback(
    (abortController: AbortController, searchSessionId: string, inspector: IInspectorInfo) => {
      if (!validateTimeRange(services.timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }

      const { sort } = stateContainer.appStateContainer.getState();
      updateSearchSource({
        volatileSearchSource: searchSource.getParent(),
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
        showUnmappedFields: useNewFieldsApi,
      });

      return searchSource
        .fetch$({
          abortSignal: abortController.signal,
          sessionId: searchSessionId,
          inspector,
        })
        .toPromise()
        .then(({ rawResponse }) => {
          return rawResponse.hits.hits;
        })
        .catch((error) => {
          // If the request was aborted then no need to surface this error in the UI
          if (error instanceof Error && error.name === 'AbortError') return;
        });
    },
    [indexPattern, services, stateContainer.appStateContainer, useNewFieldsApi, searchSource]
  );
  return {
    fetch,
  };
}
