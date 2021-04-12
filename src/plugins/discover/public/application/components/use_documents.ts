/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useState, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { validateTimeRange } from '../helpers/validate_time_range';
import { fetchStatuses } from './constants';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
  IndexPattern,
  ISearchSource,
} from '../../kibana_services';
import { RequestAdapter } from '../../../../inspector/common/adapters/request';
import { updateSearchSource } from '../helpers/update_search_source';
import { DiscoverServices } from '../../build_services';
import { GetStateReturn } from '../angular/discover_state';
import { SortOrder } from '../../saved_searches/types';
import { ElasticSearchHit } from '../doc_views/doc_views_types';

export function useDocuments({
  indexPattern,
  services,
  showUnmappedFields,
  stateContainer,
  useNewFieldsApi,
  volatileSearchSource,
  shouldSearchOnPageLoad,
}: {
  services: DiscoverServices;
  indexPattern: IndexPattern;
  useNewFieldsApi: boolean;
  showUnmappedFields: boolean;
  volatileSearchSource: ISearchSource;
  stateContainer: GetStateReturn;
  shouldSearchOnPageLoad: () => boolean;
}) {
  const [fetchStatus, setFetchStatus] = useState(
    shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED
  );
  const [fetchCounter, setFetchCounter] = useState(0);
  const [fetchError, setFetchError] = useState(undefined);

  const [documents, setDocuments] = useState<ElasticSearchHit[]>([]);
  const inspectorAdapters = useRef({ requests: new RequestAdapter() });

  const logInspectorRequest = useCallback(
    ({ searchSessionId = undefined }: { searchSessionId: string | undefined }) => {
      inspectorAdapters.current.requests.reset();
      const title = i18n.translate('discover.inspectorRequestDataTitle', {
        defaultMessage: 'data',
      });
      const description = i18n.translate('discover.inspectorRequestDescription', {
        defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
      });
      const inspectorRequest = inspectorAdapters.current.requests.start(title, {
        description,
        searchSessionId,
      });
      inspectorRequest.stats(getRequestInspectorStats(volatileSearchSource));
      volatileSearchSource.getSearchRequestBody().then((body: any) => {
        inspectorRequest.json(body);
      });
      return inspectorRequest;
    },
    [volatileSearchSource]
  );

  const fetch = useCallback(
    (abortController: AbortController, searchSessionId: string) => {
      setFetchCounter(fetchCounter + 1);
      setFetchError(undefined);

      if (!validateTimeRange(services.timefilter.getTime(), services.toastNotifications)) {
        return;
      }

      const { sort } = stateContainer.appStateContainer.getState();
      updateSearchSource({
        volatileSearchSource,
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
        showUnmappedFields,
      });
      setFetchStatus(fetchStatuses.LOADING);

      const inspectorRequest = logInspectorRequest({ searchSessionId });
      return volatileSearchSource
        .fetch({
          abortSignal: abortController.signal,
          sessionId: searchSessionId,
        })
        .then((resp) => {
          inspectorRequest
            .stats(getResponseInspectorStats(resp, volatileSearchSource))
            .ok({ json: resp });
          setDocuments(resp.hits.hits as ElasticSearchHit[]);
          setFetchStatus(fetchStatuses.COMPLETE);
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
      logInspectorRequest,
      services,
      showUnmappedFields,
      stateContainer.appStateContainer,
      useNewFieldsApi,
      volatileSearchSource,
    ]
  );
  return {
    fetchStatus,
    fetchError,
    fetchCounter,
    rows: documents,
    inspectorAdapters: inspectorAdapters.current,
    fetch,
  };
}
