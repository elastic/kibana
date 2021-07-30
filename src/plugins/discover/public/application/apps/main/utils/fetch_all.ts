/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { forkJoin, of } from 'rxjs';
import {
  sendCompleteMsg,
  sendErrorMsg,
  sendLoadingMsg,
  sendPartialMsg,
  sendResetMsg,
} from '../services/use_saved_search_messages';
import { updateSearchSource } from './update_search_source';
import { SortOrder } from '../../../../saved_searches/types';
import { fetchDocuments } from './fetch_documents';
import { fetchTotalHits } from './fetch_total_hits';
import { fetchChart } from './fetch_chart';
import { SearchSource } from '../../../../../../data/common';
import { Adapters } from '../../../../../../inspector';
import { AppState } from '../services/discover_state';
import { FetchStatus } from '../../../types';
import { DataPublicPluginStart } from '../../../../../../data/public';
import { SavedSearchData } from '../services/use_saved_search';
import { DiscoverServices } from '../../../../build_services';
import { ReduxLikeStateContainer } from '../../../../../../kibana_utils/common';

export function fetchAll(
  dataSubjects: SavedSearchData,
  searchSource: SearchSource,
  reset = false,
  fetchDeps: {
    abortController: AbortController;
    appStateContainer: ReduxLikeStateContainer<AppState>;
    inspectorAdapters: Adapters;
    data: DataPublicPluginStart;
    initialFetchStatus: FetchStatus;
    searchSessionId: string;
    services: DiscoverServices;
    useNewFieldsApi: boolean;
  }
) {
  const { initialFetchStatus, appStateContainer, services, useNewFieldsApi, data } = fetchDeps;

  const indexPattern = searchSource.getField('index')!;

  if (reset) {
    sendResetMsg(dataSubjects, initialFetchStatus);
  }

  sendLoadingMsg(dataSubjects.main$);

  const { hideChart, sort } = appStateContainer.getState();
  // Update the base searchSource, base for all child fetches
  updateSearchSource(searchSource, false, {
    indexPattern,
    services,
    sort: sort as SortOrder[],
    useNewFieldsApi,
  });

  const subFetchDeps = {
    ...fetchDeps,
    onResults: (foundDocuments: boolean) => {
      if (!foundDocuments) {
        sendCompleteMsg(dataSubjects.main$, foundDocuments);
      } else {
        sendPartialMsg(dataSubjects.main$);
      }
    },
  };

  const all = forkJoin({
    documents: fetchDocuments(dataSubjects, searchSource.createCopy(), subFetchDeps),
    totalHits:
      hideChart || !indexPattern.timeFieldName
        ? fetchTotalHits(dataSubjects, searchSource.createCopy(), subFetchDeps)
        : of(null),
    chart:
      !hideChart && indexPattern.timeFieldName
        ? fetchChart(dataSubjects, searchSource.createCopy(), subFetchDeps)
        : of(null),
  });

  all.subscribe(
    () => sendCompleteMsg(dataSubjects.main$, true),
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      data.search.showError(error);
      sendErrorMsg(dataSubjects.main$, error);
    }
  );
  return all;
}
